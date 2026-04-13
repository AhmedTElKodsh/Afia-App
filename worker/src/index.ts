import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types.ts";
import { handleAnalyze } from "./analyze.ts";
import { handleFeedback } from "./feedback.ts";
import { handleAdminAuth } from "./adminAuth.ts";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware — restrict to known origins
app.use("*", async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [
    "http://localhost:5173",
    "http://localhost:4173",
  ];

  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) return null;
      if (allowedOrigins.includes(origin)) return origin;
      
      // Strict suffix check for Cloudflare Pages previews
      const isPagesPreview = 
        origin.endsWith(".afia-app.pages.dev") || 
        origin.endsWith(".afia-oil-tracker.pages.dev");
      
      return isPagesPreview ? origin : null;
    },
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  });

  return corsMiddleware(c, next);
});

// Rate limiting middleware — 10 req/min per IP, KV-backed sliding window
app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);

  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For") ??
    `unknown-${requestId.slice(0, 8)}`; // Avoid global collision for "unknown" IPs
  
  const key = `ratelimit:${ip}`;
  const windowMs = 60_000;
  const limit = 10;
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps: number[] = [];
  try {
    const stored = await c.env.RATE_LIMIT_KV.get(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === "number" && t > windowStart);
      }
    }
  } catch (e) {
    console.error(`Rate limit parse error for ${ip}:`, e);
    timestamps = []; // Reset on corruption
  }

  if (timestamps.length >= limit) {
    const oldestInWindow = Math.min(...timestamps);
    const resetAt = Math.ceil((oldestInWindow + windowMs) / 1000);
    const retryAfter = resetAt - Math.floor(now / 1000);

    return c.json(
      {
        error: "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
        requestId,
        details: { retryAfter },
      },
      429,
      {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetAt),
      }
    );
  }

  // Add current timestamp and persist (TTL = 5 minutes to safely outlive window)
  timestamps.push(now);
  await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(timestamps), {
    expirationTtl: 300, 
  });

  const response = await next();
  response.headers.set("X-RequestId", requestId);
  return response;
});

// Routes
app.post("/analyze", handleAnalyze);
app.post("/feedback", handleFeedback);
app.post("/admin/auth", handleAdminAuth);

// Health check
app.get("/health", (c) => c.json({ status: "ok", requestId: c.get("requestId") }));

// Global error handler
app.onError((err, c) => {
  const requestId = c.get("requestId");
  console.error(`[${requestId}] Global error:`, err);
  
  return c.json({
    error: "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    requestId,
    // Avoid leaking stack traces in production
    message: c.env.DEBUG_REASONING === "true" ? err.message : undefined,
  }, 500);
});

// 404 fallback
app.all("*", (c) => c.json({ 
  error: "Not found", 
  code: "NOT_FOUND",
  requestId: c.get("requestId") 
}, 404));

export default app;
