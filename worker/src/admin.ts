import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { getGlobalScans } from "./storage/supabaseClient.ts";

/**
 * Verify admin session token (HMAC-SHA256 signed, time-limited).
 * Token format: base64(payload).base64(signature) — issued by handleAdminAuth.
 */
export async function verifyAdminSession(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<boolean> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;

  const b64Payload = token.substring(0, dotIdx);
  const b64Signature = token.substring(dotIdx + 1);

  try {
    const payload = atob(b64Payload);
    const { expiresAt } = JSON.parse(payload) as { expiresAt: number };
    if (typeof expiresAt !== "number" || expiresAt <= Date.now()) return false;

    const secret = c.env.ADMIN_JWT_SECRET || c.env.ADMIN_PASSWORD;
    if (!secret) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(b64Signature), (ch) => ch.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
  } catch {
    return false;
  }
}

/**
 * Endpoint to fetch global scan history
 */
export async function handleGetScans(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  try {
    const rawScans = await getGlobalScans(c.env);
    // Strip internal debug fields before returning to the UI
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const scans = rawScans.map(({ reasoning: _r, ...scan }) => scan);
    return c.json({ scans });
  } catch (error) {
    console.error("Failed to fetch scans:", error);
    return c.json({ error: "Failed to fetch scans", code: "INTERNAL_ERROR" }, 500);
  }
}
