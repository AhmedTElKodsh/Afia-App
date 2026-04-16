import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { getGlobalScans } from "./storage/supabaseClient.ts";

/**
 * Very simple session verification
 */
export function verifyAdminSession(c: Context<{ Bindings: Env; Variables: Variables }>): boolean {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  try {
    const decoded = atob(token);
    const [expiresAtStr] = decoded.split(":");
    const expiresAt = Number(expiresAtStr);
    return !isNaN(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
}

/**
 * Endpoint to fetch global scan history
 */
export async function handleGetScans(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  if (!verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  try {
    const scans = await getGlobalScans(c.env);
    return c.json({ scans });
  } catch (error) {
    console.error("Failed to fetch scans:", error);
    return c.json({ error: "Failed to fetch scans", code: "INTERNAL_ERROR" }, 500);
  }
}
