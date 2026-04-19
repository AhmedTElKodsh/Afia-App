import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { storeScan } from "./storage/supabaseClient.ts";
import { MonitoringLogger } from "./monitoring/logger.ts";
import { getBottleBySku } from "./bottleRegistry.ts";

export async function handleLogScan(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  const logger = new MonitoringLogger(c.env.BETTERSTACK_TOKEN);
  const startTime = Date.now();

  try {
    let body: { sku: string; imageBase64: string; localModelPrediction: { percentage: number; confidence: string }; latencyMs: number };
    try { body = await c.req.json(); }
    catch { return c.json({ error: "Invalid JSON body", code: "INVALID_REQUEST" }, 400); }

    const MAX_LOG_IMAGE_SIZE = Math.ceil(4 * 1024 * 1024 * (4 / 3));
    if (!body.sku || !body.imageBase64 || !body.localModelPrediction) {
      return c.json({ error: "Missing required fields", code: "INVALID_REQUEST" }, 400);
    }
    if (body.imageBase64.length > MAX_LOG_IMAGE_SIZE) {
      return c.json({ error: 'Image too large (max 4MB)', code: 'IMAGE_TOO_LARGE' }, 400);
    }
    if (typeof body.localModelPrediction !== 'object' || typeof body.localModelPrediction.percentage !== 'number' || typeof body.latencyMs !== 'number') {
      return c.json({ error: "Invalid field types: percentage and latencyMs must be numbers", code: "INVALID_REQUEST" }, 400);
    }

    const scanId = crypto.randomUUID();
    const bottle = getBottleBySku(body.sku);
    
    // Store scan data to Supabase (non-blocking)
    c.executionCtx.waitUntil(
      storeScan(c.env, scanId, body.imageBase64, {
        scanId,
        timestamp: new Date().toISOString(),
        sku: body.sku,
        bottleGeometry: bottle?.geometry || { shape: "cylinder" },
        oilType: bottle?.oilType || "unknown",
        totalVolumeMl: bottle?.totalVolumeMl || 0,
        aiProvider: "local-cnn",
        fillPercentage: body.localModelPrediction.percentage,
        confidence: body.localModelPrediction.confidence,
        latencyMs: body.latencyMs,
        localModelPrediction: body.localModelPrediction,
      }).catch((err) => console.error("Supabase storage failed:", err))
    );

    await logger.info("Local scan logged", {
      scanId,
      sku: body.sku,
      fillPercentage: body.localModelPrediction.percentage,
      latencyMs: body.latencyMs,
    });

    return c.json({ status: "ok", scanId });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    await logger.error("Log scan request failed", {
      error: String(error),
      latencyMs,
    });
    return c.json({ error: "Internal server error", code: "INTERNAL_SERVER_ERROR" }, 500);
  }
}
