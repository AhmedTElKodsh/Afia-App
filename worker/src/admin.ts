import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { getGlobalScans } from "./storage/supabaseClient.ts";
import { verifyToken } from "./security.ts";

/**
 * Verify admin session token (HMAC-SHA256 signed, time-limited).
 * Uses secret rotation support from security utility.
 */
export async function verifyAdminSession(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<boolean> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env);
  
  return payload !== null;
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
