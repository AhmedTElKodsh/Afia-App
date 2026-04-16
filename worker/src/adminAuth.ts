import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
  const body = await c.req.json<{ password?: unknown }>();

  if (typeof body.password !== "string" || !body.password) {
    return c.json({ error: "Missing password", code: "INVALID_REQUEST" }, 400);
  }

  const adminPassword = c.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return c.json({ error: "Admin authentication not configured", code: "NOT_CONFIGURED" }, 503);
  }

  if (body.password !== adminPassword) {
    return c.json({ error: "Invalid password", code: "UNAUTHORIZED" }, 401);
  }

  // Issue a time-limited signed token
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = JSON.stringify({ expiresAt, nonce: crypto.randomUUID() });
  const token = await signToken(payload, adminPassword);

  return c.json({ token, expiresAt });
}
