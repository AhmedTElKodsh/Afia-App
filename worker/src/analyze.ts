import type { Context } from "hono";
import type { Env } from "./types.ts";
import { getBottleBySku } from "./bottleRegistry.ts";
import { callGemini } from "./providers/gemini.ts";
import { callGroq } from "./providers/groq.ts";
import { storeScan } from "./storage/r2Client.ts";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB base64

export async function handleAnalyze(c: Context<{ Bindings: Env }>): Promise<Response> {
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
  const startTime = Date.now();
  let aiProvider: "gemini" | "groq" = "gemini";

  // Pick a random Gemini key from available keys for load distribution
  const geminiKeys = [
    c.env.GEMINI_API_KEY,
    c.env.GEMINI_API_KEY2,
    c.env.GEMINI_API_KEY3,
  ].filter((k): k is string => typeof k === "string" && k.length > 0);
  const geminiKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)];

  // Try Gemini first, fall back to Groq
  let llmResult;
  try {
    llmResult = await callGemini(body.imageBase64, bottle, geminiKey);
  } catch (geminiError) {
    console.warn("Gemini failed, falling back to Groq:", geminiError);
    try {
      aiProvider = "groq";
      llmResult = await callGroq(body.imageBase64, bottle, c.env.GROQ_API_KEY);
    } catch (groqError) {
      console.error("Both LLM providers failed:", groqError);
      return c.json(
        { error: "All AI providers failed", code: "SERVICE_UNAVAILABLE" },
        503
      );
    }
  }

  const latencyMs = Date.now() - startTime;

  // Store scan data to R2 (non-blocking — don't fail the response if storage fails)
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
    }).catch((err) => console.error("R2 storage failed:", err))
  );

  return c.json({
    scanId,
    fillPercentage: llmResult.fillPercentage,
    confidence: llmResult.confidence,
    aiProvider,
    latencyMs,
    imageQualityIssues:
      llmResult.imageQualityIssues && llmResult.imageQualityIssues.length > 0
        ? llmResult.imageQualityIssues
        : undefined,
  });
}
