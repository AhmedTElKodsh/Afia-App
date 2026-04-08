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

  // Wildcard suffixes: allow all Cloudflare Pages preview deployments
  // e.g. https://abc123.afia-app.pages.dev as well as the canonical root
  const allowedSuffixes = [".afia-app.pages.dev", ".afia-oil-tracker.pages.dev"];

  const corsMiddleware = cors({
    origin: (origin) => {
      if (allowedOrigins.includes(origin)) return origin;
      if (allowedSuffixes.some((s) => origin.endsWith(s))) return origin;
      return null;
    },
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  });

  return corsMiddleware(c, next);
});

// Rate limiting middleware — 10 req/min per IP, KV-backed sliding window
app.use("*", async (c, next) => {
  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For") ??
    "unknown";
  const key = `ratelimit:${ip}`;
  const windowMs = 60_000;
  const limit = 10;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps for this IP
  const stored = await c.env.RATE_LIMIT_KV.get(key);
  const timestamps: number[] = stored ? (JSON.parse(stored) as number[]) : [];

  // Filter to only requests within the current window
  const windowTimestamps = timestamps.filter((t) => t > windowStart);

  if (windowTimestamps.length >= limit) {
    const oldestInWindow = Math.min(...windowTimestamps);
    const resetAt = Math.ceil((oldestInWindow + windowMs) / 1000);
    const retryAfter = resetAt - Math.floor(now / 1000);

    return c.json(
      {
        error: "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
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

  // Add current timestamp and persist (TTL = 1 minute)
  windowTimestamps.push(now);
  await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(windowTimestamps), {
    expirationTtl: 60,
  });

  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(limit - windowTimestamps.length));
  c.header(
    "X-RateLimit-Reset",
    String(Math.ceil((windowTimestamps[0] + windowMs) / 1000))
  );

  return next();
});

// Routes
app.post("/analyze", handleAnalyze);
app.post("/feedback", handleFeedback);
app.post("/admin/auth", handleAdminAuth);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// 404 fallback
app.all("*", (c) => c.json({ error: "Not found", code: "NOT_FOUND" }, 404));

export default app;
