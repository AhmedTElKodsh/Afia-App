import type { Context } from "hono";
import type { Env } from "./types.ts";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function handleAdminAuth(c: Context<{ Bindings: Env }>): Promise<Response> {
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

  // Issue a time-limited token: base64(expiresAt:randomSecret)
  // Not cryptographically signed — adequate for a single-admin MVP tool
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = btoa(`${expiresAt}:${crypto.randomUUID()}`);

  return c.json({ token, expiresAt });
}
