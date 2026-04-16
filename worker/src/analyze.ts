import type { Context } from "hono";
import type { Env } from "./types.ts";
import { getBottleBySku, type BottleEntry } from "./bottleRegistry.ts";
import { calculateRemainingMl } from "../../shared/volumeCalculator.ts";
import { callGemini } from "./providers/gemini.ts";
import { callGroq } from "./providers/groq.ts";
import { callOpenRouter } from "./providers/openrouter.ts";
import { callMistral } from "./providers/mistral.ts";
import { storeScan } from "./storage/supabaseClient.ts";
import { MonitoringLogger } from "./monitoring/logger.ts";
import { QuotaMonitor } from "./monitoring/quotaMonitor.ts";
import type { LLMResponse, Variables } from "./types.ts";

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB base64
const CACHE_TTL_SECONDS = 1800; // 30 minutes

/** SHA-256 hex of imageBase64+sku — used as KV cache key */
async function buildCacheKey(imageBase64: string, sku: string): Promise<string> {
  const data = new TextEncoder().encode(imageBase64 + "\x00" + sku);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `scan:${hex}`;
}

/** Rough token estimate for monitoring — not billed, just informational */
function estimateTokens(imageBase64: string): number {
  // Image: base64 chars → approx JPEG pixel count → Gemini tile tokens
  // Empirically: ~1 token per 270 base64 chars (captures tile-based pricing), capped at 2048
  const imageTokens = Math.min(Math.ceil(imageBase64.length / 270), 2048);
  const promptTokens = 110; // ~90 system + ~20 user (compressed prompts)
  return imageTokens + promptTokens;
}

export async function handleAnalyze(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  const logger = new MonitoringLogger(c.env.BETTERSTACK_TOKEN);
  const quotaMonitor = new QuotaMonitor(logger, c.env.RATE_LIMIT_KV);
  const startTime = Date.now();
  const debugReasoning = c.env.DEBUG_REASONING === "true";

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

    // Extract as typed consts so TypeScript preserves string narrowing inside closures
    const imageBase64 = body.imageBase64;
    const sku = body.sku;

    const bottle = getBottleBySku(sku);
    // Note: Story 5.3 allows "Community Contribution" scans for unknown SKUs.
    // If bottle is not found, we proceed with a generic "unknown" bottle context
    // but skip geometry-based volume math later.
    const effectiveBottle: BottleEntry = bottle || {
      sku: "unknown",
      name: "Unknown Bottle",
      oilType: "unknown",
      totalVolumeMl: 0,
      geometry: { shape: "cylinder", heightMm: 0, diameterMm: 0 }
    };

    const tokensEstimated = estimateTokens(imageBase64);

    // --- KV response cache (30 min TTL) ---
    const cacheKey = await buildCacheKey(imageBase64, sku);
    const cached = await c.env.RATE_LIMIT_KV.get(cacheKey);
    if (cached) {
      const { llmResult, aiProvider, scanId: cachedScanId } = JSON.parse(cached) as {
        llmResult: LLMResponse;
        aiProvider: "gemini" | "groq" | "openrouter" | "mistral";
        scanId?: string;
      };
      // Guard: corrupt/stale cache entry — discard and fall through to re-run
      if (
        typeof llmResult?.fillPercentage === "number" &&
        ["high", "medium", "low"].includes(llmResult?.confidence as string)
      ) {
        const remainingMl = bottle 
          ? Math.round(calculateRemainingMl(llmResult.fillPercentage, bottle.totalVolumeMl, bottle.geometry))
          : 0;
        const latencyMs = Date.now() - startTime;
        await logger.info("Cache hit — returning cached result", {
          sku,
          cacheKey,
          latencyMs,
        });
        return c.json({
          scanId: cachedScanId || crypto.randomUUID(),
          fillPercentage: llmResult.fillPercentage,
          remainingMl,
          confidence: llmResult.confidence,
          aiProvider,
          latencyMs,
          cacheHit: true,
          tokensEstimated,
          red_line_y_normalized: llmResult.red_line_y_normalized,
          imageQualityIssues:
            llmResult.imageQualityIssues && llmResult.imageQualityIssues.length > 0
              ? llmResult.imageQualityIssues
              : undefined,
          isUnsupportedSku: !bottle,
        });
      }
      await logger.warn("Corrupt cache entry discarded, re-running analysis", { cacheKey, sku });
    }

    type ProviderName = "gemini" | "groq" | "openrouter" | "mistral";
    type ProviderCallResult = { result: LLMResponse; keyName: string };
    type Provider = { name: ProviderName; call: () => Promise<ProviderCallResult> };

    const scanId = crypto.randomUUID();
    let aiProvider: ProviderName = "gemini";
    let keyUsed = "gemini_key_1";

    // Collect all available Gemini API keys
    const geminiKeys = [
      c.env.GEMINI_API_KEY,
      c.env.GEMINI_API_KEY2,
      c.env.GEMINI_API_KEY3,
      c.env.GEMINI_API_KEY4,
    ].filter((k): k is string => typeof k === "string" && k.length > 0);

    // --- Round-Robin Selection ---
    const lastIndexStr = await c.env.RATE_LIMIT_KV.get("gemini_last_index");
    const startIndex = geminiKeys.length > 0 
      ? (parseInt(lastIndexStr || "0", 10) + 1) % geminiKeys.length 
      : 0;
    
    // Rotate keys so they start at the next round-robin position
    const rotatedGeminiKeys = geminiKeys.length > 0
      ? [...geminiKeys.slice(startIndex), ...geminiKeys.slice(0, startIndex)]
      : [];

    // Persist new index (non-blocking)
    if (geminiKeys.length > 0) {
      c.executionCtx.waitUntil(
        c.env.RATE_LIMIT_KV.put("gemini_last_index", startIndex.toString())
          .catch(err => console.error("KV put failed:", err))
      );
    }

    const providers: Provider[] = [
      { 
        name: "gemini", 
        call: async () => {
          if (rotatedGeminiKeys.length === 0) throw new Error("No Gemini API keys configured");
          const { result, keyIndex } = await callGemini(imageBase64, effectiveBottle, rotatedGeminiKeys, debugReasoning);
          // Map back to original index for accurate quota tracking
          const actualIndex = (startIndex + keyIndex) % geminiKeys.length;
          return { result, keyName: `gemini_key_${actualIndex + 1}` };
        }
      },
      { 
        name: "groq", 
        call: async () => { 
          if (!c.env.GROQ_API_KEY) throw new Error("No Groq API key configured"); 
          const result = await callGroq(imageBase64, effectiveBottle, c.env.GROQ_API_KEY, debugReasoning);
          return { result, keyName: "groq" };
        } 
      },
      { 
        name: "openrouter", 
        call: async () => { 
          if (!c.env.OPENROUTER_API_KEY) throw new Error("No OpenRouter API key configured"); 
          const result = await callOpenRouter(imageBase64, effectiveBottle, c.env.OPENROUTER_API_KEY, debugReasoning);
          return { result, keyName: "openrouter" };
        } 
      },
      { 
        name: "mistral", 
        call: async () => { 
          if (!c.env.MISTRAL_API_KEY) throw new Error("No Mistral API key configured"); 
          const result = await callMistral(imageBase64, effectiveBottle, c.env.MISTRAL_API_KEY, debugReasoning);
          return { result, keyName: "mistral" };
        } 
      },
    ];

    // Fallback chain: Gemini (rotated keys) → Groq → OpenRouter → Mistral
    let llmResult!: LLMResponse;
    const providerErrors: string[] = [];
    let succeeded = false;
    for (const provider of providers) {
      try {
        const providerRes = await provider.call();
        llmResult = providerRes.result;
        aiProvider = provider.name;
        keyUsed = providerRes.keyName;
        await quotaMonitor.trackRequest(keyUsed);
        succeeded = true;
        break;
      } catch (err) {
        providerErrors.push(`${provider.name}: ${String(err)}`);
        const next = providers[providers.indexOf(provider) + 1];
        if (next) {
          await logger.warn(`${provider.name} failed, trying ${next.name}`, { error: String(err), sku });
        }
      }
    }

    if (!succeeded) {
      const latencyMs = Date.now() - startTime;
      await logger.error("All AI providers failed", { errors: providerErrors, sku, latencyMs });
      return c.json({ 
        error: "Image analysis temporarily unavailable. Please try again.", 
        code: "SERVICE_UNAVAILABLE",
        requestId: c.get("requestId")
      }, 503);
    }

    const latencyMs = Date.now() - startTime;

    // Store result in KV cache (non-blocking)
    c.executionCtx.waitUntil(
      c.env.RATE_LIMIT_KV.put(
        cacheKey,
        JSON.stringify({ llmResult, aiProvider, scanId }),
        { expirationTtl: CACHE_TTL_SECONDS }
      ).catch((err) => console.error("Cache store failed:", err))
    );

    // Log successful analysis
    await logger.info("Analysis completed", {
      scanId,
      sku,
      fillPercentage: llmResult.fillPercentage,
      confidence: llmResult.confidence,
      aiProvider: keyUsed,
      latencyMs,
      tokensEstimated,
      hasQualityIssues: llmResult.imageQualityIssues && llmResult.imageQualityIssues.length > 0,
      isUnsupportedSku: !bottle,
    });

    // Store scan data to Supabase (non-blocking — don't fail the response if storage fails)
    c.executionCtx.waitUntil(
      storeScan(c.env, scanId, imageBase64, {
        scanId,
        timestamp: new Date().toISOString(),
        sku: bottle ? bottle.sku : `unsupported_${sku}`,
        bottleGeometry: effectiveBottle.geometry,
        oilType: effectiveBottle.oilType,
        totalVolumeMl: effectiveBottle.totalVolumeMl,
        aiProvider,
        fillPercentage: llmResult.fillPercentage,
        confidence: llmResult.confidence,
        latencyMs,
        imageQualityIssues: llmResult.imageQualityIssues,
        isContribution: !bottle,
      }).catch((err) => console.error("Supabase storage failed:", err))
    );

    // Calculate remaining ml from fill percentage and bottle volume
    const remainingMl = bottle 
      ? Math.round(calculateRemainingMl(llmResult.fillPercentage, bottle.totalVolumeMl, bottle.geometry))
      : 0;

    return c.json({
      scanId,
      fillPercentage: llmResult.fillPercentage,
      remainingMl,
      confidence: llmResult.confidence,
      aiProvider,
      latencyMs,
      cacheHit: false,
      tokensEstimated,
      red_line_y_normalized: llmResult.red_line_y_normalized,
      imageQualityIssues:
        llmResult.imageQualityIssues && llmResult.imageQualityIssues.length > 0
          ? llmResult.imageQualityIssues
          : undefined,
      isUnsupportedSku: !bottle,
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
