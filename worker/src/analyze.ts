import type { Context } from "hono";
import type { Env } from "./types.ts";
import { getBottleBySku } from "./bottleRegistry.ts";
import { callGemini } from "./providers/gemini.ts";
import { callGroq } from "./providers/groq.ts";
import { storeScan } from "./storage/supabaseClient.ts";
import { MonitoringLogger } from "./monitoring/logger.ts";
import { QuotaMonitor } from "./monitoring/quotaMonitor.ts";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB base64

export async function handleAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
  const logger = new MonitoringLogger(c.env.BETTERSTACK_TOKEN);
  const quotaMonitor = new QuotaMonitor(logger, c.env.RATE_LIMIT_KV);
  const startTime = Date.now();

  try {
    const body = await c.req.json<{ sku?: unknown; imageBase64?: unknown }>();

    // Validate request
    if (typeof body.sku !== "string" || !body.sku) {
      return c.json({ error: "Missing required field: sku", code: "INVALID_REQUEST" }, 400);
    }
    if (typeof body.imageBase64 !== "string" || !body.imageBase64) {
      return c.json({ error: "Missing required field: imageBase64", code: "INVALID_REQUEST" }, 400);
    }
    if (body.imageBase64.length > MAX_IMAGE_SIZE_BYTES) {
      return c.json({ error: "Image too large (max 4MB)", code: "IMAGE_TOO_LARGE" }, 400);
    }

    const bottle = getBottleBySku(body.sku);
    if (!bottle) {
      return c.json({ error: `Unknown SKU: ${body.sku}`, code: "UNKNOWN_SKU" }, 400);
    }

    const scanId = crypto.randomUUID();
    let aiProvider: "gemini" | "groq" = "gemini";
    let keyUsed = "gemini_key_1";

    // Collect all available Gemini API keys for sequential fallback
    const geminiKeys = [
      c.env.GEMINI_API_KEY,
      c.env.GEMINI_API_KEY2,
      c.env.GEMINI_API_KEY3,
    ].filter((k): k is string => typeof k === "string" && k.length > 0);

    // Try Gemini first with all keys (sequential fallback), fall back to Groq
    let llmResult;
    try {
      llmResult = await callGemini(body.imageBase64, bottle, geminiKeys);
      await quotaMonitor.trackRequest(keyUsed);
    } catch (geminiError) {
      await logger.warn("All Gemini keys failed, falling back to Groq", {
        error: String(geminiError),
        sku: body.sku,
      });
      
      try {
        aiProvider = "groq";
        keyUsed = "groq";
        llmResult = await callGroq(body.imageBase64, bottle, c.env.GROQ_API_KEY);
        await quotaMonitor.trackRequest(keyUsed);
      } catch (groqError) {
        const latencyMs = Date.now() - startTime;
        await logger.error("All AI providers failed", {
          geminiError: String(geminiError),
          groqError: String(groqError),
          sku: body.sku,
          latencyMs,
        });
        return c.json(
          { error: "All AI providers failed", code: "SERVICE_UNAVAILABLE" },
          503
        );
      }
    }

    const latencyMs = Date.now() - startTime;

    // Log successful analysis
    await logger.info("Analysis completed", {
      scanId,
      sku: body.sku,
      fillPercentage: llmResult.fillPercentage,
      confidence: llmResult.confidence,
      aiProvider: keyUsed,
      latencyMs,
      hasQualityIssues: llmResult.imageQualityIssues && llmResult.imageQualityIssues.length > 0,
    });

    // Store scan data to Supabase (non-blocking — don't fail the response if storage fails)
    c.executionCtx.waitUntil(
      storeScan(c.env, scanId, body.imageBase64, {
        scanId,
        timestamp: new Date().toISOString(),
        sku: bottle.sku,
        bottleGeometry: bottle.geometry,
        oilType: bottle.oilType,
        aiProvider,
        fillPercentage: llmResult.fillPercentage,
        confidence: llmResult.confidence,
        latencyMs,
        imageQualityIssues: llmResult.imageQualityIssues,
      }).catch((err) => console.error("Supabase storage failed:", err))
    );

    // Calculate remaining ml from fill percentage and bottle volume
    const remainingMl = Math.round(bottle.totalVolumeMl * (llmResult.fillPercentage / 100));

    return c.json({
      scanId,
      fillPercentage: llmResult.fillPercentage,
      remainingMl,
      confidence: llmResult.confidence,
      aiProvider,
      latencyMs,
      imageQualityIssues:
        llmResult.imageQualityIssues && llmResult.imageQualityIssues.length > 0
          ? llmResult.imageQualityIssues
          : undefined,
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    await logger.error("Analysis request failed", {
      error: String(error),
      latencyMs,
    });
    throw error;
  }
}
