import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./types.ts";
import { handleAnalyze } from "./analyze.ts";
import { handleFeedback } from "./feedback.ts";
import { handleAdminAuth } from "./adminAuth.ts";
import { handleModelVersion } from "./modelVersion.ts";
import { handleAdminCorrect } from "./adminCorrect.ts";
import { handleAdminRerunLlm } from "./adminRerunLlm.ts";
import { verifyAdminSession, handleGetScans } from "./admin.ts";
import { handleLogScan } from "./logScan.ts";
import {
  handleGetVersions,
  handleActivateVersion,
  handleDeactivateVersion
} from "./admin/modelVersions.ts";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS middleware — restrict to known origins
app.use("*", async (c, next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [
    "http://localhost:5173",
    "http://localhost:4173",
  ];

  const corsMiddleware = cors({
    origin: (origin) => {
      if (!origin) return null;
      if (allowedOrigins.includes(origin)) return origin;
      
      // Strict regex check for Cloudflare Pages previews - prevents subdomain attacks
      const isPagesPreview = 
        /^https:\/\/[a-z0-9-]+\.afia-app\.pages\.dev$/.test(origin) || 
        /^https:\/\/[a-z0-9-]+\.afia-oil-tracker\.pages\.dev$/.test(origin);
      
      return isPagesPreview ? origin : null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  return corsMiddleware(c, next);
});

// Rate limiting middleware — 30 req/min per IP (3 req/min for admin auth), KV-backed sliding window
app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);

  // Check for mock mode header - bypass rate limiting for tests
  const mockMode = c.req.header("X-Mock-Mode");
  if (mockMode === "true") {
    // Enable mock LLM for this request
    c.env.ENABLE_MOCK_LLM = "true";
    // Set flag to bypass rate limiting
    c.set('skipRateLimit', true);
    try {
      const response = await next();
      c.header("X-RequestId", requestId);
      return response;
    } finally {
      // Clean up mock mode flag after request
      delete c.env.ENABLE_MOCK_LLM;
    }
  }

  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For") ??
    "127.0.0.1"; // Fallback for local development

  // Skip rate limiting if in mock mode
  if (c.get('skipRateLimit')) {
    const response = await next();
    c.header("X-RequestId", requestId);
    return response;
  }

  // Skip rate limiting entirely if KV is not available (local development without KV setup)
  if (!c.env.RATE_LIMIT_KV) {
    console.warn("Rate limiting disabled: RATE_LIMIT_KV not configured");
    const response = await next();
    c.header("X-RequestId", requestId);
    return response;
  }

  // Only enforce IP requirement in production (Cloudflare provides CF-Connecting-IP)
  // In local development, 127.0.0.1 is acceptable
  if (!ip) {
    return c.json(
      {
        error: "Missing client identification",
        code: "BAD_REQUEST",
        requestId,
      },
      400
    );
  }
  
  // Stricter rate limiting for admin auth endpoint (3 attempts per minute)
  const isAdminAuth = c.req.path === "/admin/auth";
  const key = isAdminAuth ? `ratelimit:admin:${ip}` : `ratelimit:${ip}`;
  const windowMs = 60_000;
  const limit = isAdminAuth ? 3 : 30;
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
        error: isAdminAuth ? "Too many authentication attempts. Please try again later." : "Rate limit exceeded",
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
  try {
    await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(timestamps), {
      expirationTtl: 300,
    });
  } catch (e) {
    // Fail open: log error but allow request to proceed if KV is down
    console.error(`Rate limit write failed for ${ip}:`, e);
  }

  const response = await next();
  c.header("X-RequestId", requestId);
  return response;
});

// Routes
app.post("/analyze", handleAnalyze);
app.post("/feedback", handleFeedback);
app.post("/log-scan", handleLogScan);
app.post("/admin/auth", handleAdminAuth);
app.post("/admin/correct", handleAdminCorrect);
app.post("/admin/rerun-llm", handleAdminRerunLlm);
app.get("/model/version", handleModelVersion);

app.get("/admin/scans", handleGetScans);

// Model version management routes (Story 10-2) - Protected by authentication
app.get("/admin/model/versions", async (c) => {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  return handleGetVersions(c.env);
});

app.post("/admin/model/activate", async (c) => {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  return handleActivateVersion(c.req.raw, c.env);
});

app.post("/admin/model/deactivate", async (c) => {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  return handleDeactivateVersion(c.req.raw, c.env);
});

// Admin export — not yet implemented
app.get("/admin/export", async (c) => {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  return c.json({ error: "Not implemented", code: "NOT_IMPLEMENTED" }, 501);
});

// Admin upload — not yet implemented
app.post("/admin/upload", async (c) => {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  return c.json({ error: "Not implemented", code: "NOT_IMPLEMENTED" }, 501);
});

// Error telemetry
app.post("/error", async (c) => {
  try {
    const body = await c.req.json<{ sku?: string; error?: string; timestamp?: string; deviceInfo?: string }>();
    console.error("[client-error]", JSON.stringify(body));
  } catch {
    // Ignore malformed telemetry
  }
  return c.json({ ok: true });
});

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

