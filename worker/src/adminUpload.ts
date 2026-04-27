import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { verifyAdminSession } from "./admin.ts";
import { storeAdminUpload } from "./storage/supabaseClient.ts";
import { getBottleBySku } from "./bottleRegistry.ts";

export async function handleAdminUpload(
  c: Context<{ Bindings: Env; Variables: Variables }>
): Promise<Response> {
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid form data", code: "BAD_REQUEST" }, 400);
  }

  const file = formData.get("file") as File | null;
  const sku = formData.get("sku") as string | null;
  const fillPctRaw = formData.get("fillPercentage") as string | null;
  const augType = (formData.get("augmentationType") as string) || "none";

  if (!file) return c.json({ error: "Missing file", code: "MISSING_FILE" }, 400);
  if (!["image/jpeg", "image/png"].includes(file.type))
    return c.json({ error: "Invalid file type", code: "INVALID_FILE_TYPE" }, 400);
  if (file.size > 4 * 1024 * 1024)
    return c.json({ error: "File too large (max 4MB)", code: "FILE_TOO_LARGE" }, 413);
  if (!sku || !getBottleBySku(sku))
    return c.json({ error: "Invalid SKU", code: "INVALID_SKU" }, 400);
  const fillPct = parseFloat(fillPctRaw ?? "");
  if (!Number.isFinite(fillPct) || fillPct < 0 || fillPct > 100)
    return c.json({ error: "fillPercentage must be 0–100", code: "INVALID_FILL_PERCENTAGE" }, 400);

  const scanId = `admin-${crypto.randomUUID()}`;
  const imageBuffer = await file.arrayBuffer();

  try {
    await storeAdminUpload(c.env, scanId, imageBuffer, sku, fillPct, augType);
  } catch (err) {
    console.error("[admin-upload] Storage failed:", err);
    return c.json({ error: "Storage failed", code: "INTERNAL_ERROR" }, 500);
  }

  return c.json({ ok: true, scanId });
}
