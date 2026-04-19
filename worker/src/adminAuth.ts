import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const LOCKOUT_WINDOW_MS = 900_000; // 15 minutes
const LOCKOUT_LIMIT = 5;
const LOCKOUT_TTL_S = 900; // 15 minutes in seconds

async function signToken(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const b64Payload = btoa(payload);
  const b64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${b64Payload}.${b64Signature}`;
}

export async function handleAdminAuth(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  // Step 1: Parse JSON body
  let body: { password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body", code: "INVALID_REQUEST" }, 400);
  }

  // Step 2: Validate password field
  if (typeof body.password !== "string" || !body.password) {
    return c.json({ error: "Missing password", code: "INVALID_REQUEST" }, 400);
  }
  const password = body.password;

  const adminPassword = c.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return c.json({ error: "Admin authentication not configured", code: "NOT_CONFIGURED" }, 503);
  }

  // Step 3: Read IP. The 'unknown' fallback is technically unreachable — the global rate-limit
  // middleware returns 400 for missing IP before this handler runs. Kept as a defensive safety net.
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const lockoutKey = `auth_lockout:${ip}`;
  const now = Date.now();
  const windowStart = now - LOCKOUT_WINDOW_MS;

  // Step 4: Read and filter lockout timestamps (KV timestamp-list pattern)
  let timestamps: number[] = [];
  try {
    const stored = await c.env.RATE_LIMIT_KV.get(lockoutKey);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t): t is number => typeof t === "number" && t > windowStart);
      }
    }
  } catch {
    timestamps = [];
  }

  // Step 5: If locked out, extend window and return 401 — same message as wrong password, no hint.
  // Extending the window prevents boundary-timing attacks (attacker can't brute-force by waiting exactly 15 min).
  if (timestamps.length >= LOCKOUT_LIMIT) {
    timestamps.push(now);
    await c.env.RATE_LIMIT_KV.put(lockoutKey, JSON.stringify(timestamps), {
      expirationTtl: LOCKOUT_TTL_S,
    }).catch(() => { /* non-fatal */ });
    return c.json({ error: "Invalid password", code: "UNAUTHORIZED" }, 401);
  }

  // Step 6: Timing-safe HMAC comparison.
  // Strategy: sign candidate with real-password-as-key, then verify against real-password.
  // verify(key, sig, data) checks HMAC(key,data)==sig — true only when candidate==adminPassword.
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(adminPassword),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
  const candidateSig = await crypto.subtle.sign("HMAC", keyMaterial, encoder.encode(password));
  const passwordMatch = await crypto.subtle.verify("HMAC", keyMaterial, candidateSig, encoder.encode(adminPassword));

  if (!passwordMatch) {
    // Step 7: Record failure and extend window
    timestamps.push(now);
    await c.env.RATE_LIMIT_KV.put(lockoutKey, JSON.stringify(timestamps), {
      expirationTtl: LOCKOUT_TTL_S,
    }).catch(() => { /* non-fatal */ });
    return c.json({ error: "Invalid password", code: "UNAUTHORIZED" }, 401);
  }

  // Step 8: Success — clear lockout and issue a time-limited signed token
  await c.env.RATE_LIMIT_KV.delete(lockoutKey).catch(() => { /* non-fatal */ });

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = JSON.stringify({ expiresAt, nonce: crypto.randomUUID() });
  const token = await signToken(payload, adminPassword);

  return c.json({ token, expiresAt });
}
