/**
 * Admin LLM Re-run Handler
 * Story 7.7 - Admin Correction Feedback Loop
 * 
 * Re-runs LLM inference on a scan using key rotation
 * Stores result in adminLlmResult metadata field
 */

import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { verifyAdminSession } from "./admin.ts";
import { getMetadata, putMetadata, getImage } from "./storage/r2Client.ts";
import { callGemini } from "./providers/gemini.ts";
import { callGroq } from "./providers/groq.ts";
import { getBottleBySku } from "./bottleRegistry.ts";

export interface AdminRerunLlmRequest {
  scanId: string;
}

export interface AdminRerunLlmResponse {
  adminLlmResult: {
    fillPercentage: number;
    confidence: "high" | "medium" | "low";
    provider: string;
    rerunAt: string;
  };
}

export async function handleAdminRerunLlm(
  c: Context<{ Bindings: Env; Variables: Variables }>
): Promise<Response> {
  // AC: Admin auth required
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<AdminRerunLlmRequest>();
    const { scanId } = body;

    if (!scanId) {
      return c.json(
        { error: "Missing scanId", code: "VALIDATION_ERROR", requestId },
        400
      );
    }

    // Load existing metadata
    const metadata = await getMetadata(c.env, scanId);
    if (!metadata) {
      return c.json(
        { error: "Scan not found", code: "NOT_FOUND", requestId },
        404
      );
    }

    // Load image from Supabase Storage
    const imageBuffer = await getImage(c.env, scanId);
    if (!imageBuffer) {
      return c.json(
        { error: "Image not found", code: "NOT_FOUND", requestId },
        404
      );
    }

    // Convert buffer to base64 using chunked approach to avoid call-stack overflow on large images
    const uint8Array = new Uint8Array(imageBuffer);
    const CHUNK = 8192;
    let binaryString = "";
    for (let i = 0; i < uint8Array.length; i += CHUNK) {
      binaryString += String.fromCharCode(...uint8Array.subarray(i, i + CHUNK));
    }
    const base64Image = btoa(binaryString);

    // Get bottle info for prompt — strip unsupported_ prefix added for community contribution scans
    const lookupSku = metadata.sku.replace(/^unsupported_/, "");
    const bottle = getBottleBySku(lookupSku);
    if (!bottle) {
      return c.json(
        { error: "Bottle not found in registry", code: "NOT_FOUND", requestId },
        404
      );
    }

    // Collect Gemini API keys
    const geminiKeys = [
      c.env.GEMINI_API_KEY,
      c.env.GEMINI_API_KEY2,
      c.env.GEMINI_API_KEY3,
      c.env.GEMINI_API_KEY4,
    ].filter((k): k is string => typeof k === "string" && k.length > 0);

    // Re-call LLM using key rotation (Gemini → Groq fallback)
    let llmResult: { fillPercentage: number; confidence: "high" | "medium" | "low"; provider: string } | null = null;
    let lastError: Error | null = null;

    // Try Gemini first with key rotation
    if (geminiKeys.length > 0) {
      try {
        const geminiResult = await callGemini(base64Image, bottle, geminiKeys, false);
        llmResult = {
          fillPercentage: geminiResult.result.fillPercentage,
          confidence: geminiResult.result.confidence,
          provider: "gemini",
        };
      } catch (error) {
        console.warn(`[${requestId}] Gemini re-run failed, trying Groq:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    // Fallback to Groq if Gemini failed
    if (!llmResult && c.env.GROQ_API_KEY) {
      try {
        const groqResult = await callGroq(base64Image, bottle, c.env.GROQ_API_KEY, false);
        llmResult = {
          fillPercentage: groqResult.fillPercentage,
          confidence: groqResult.confidence,
          provider: "groq",
        };
      } catch (groqError) {
        console.error(`[${requestId}] Groq re-run also failed:`, groqError);
        lastError = groqError instanceof Error ? groqError : new Error(String(groqError));
      }
    }

    if (!llmResult) {
      return c.json(
        {
          error: "LLM re-run failed",
          code: "LLM_ERROR",
          requestId,
          message: lastError?.message || "All providers failed",
        },
        500
      );
    }

    // Store result in metadata
    const rerunAt = new Date().toISOString();
    metadata.adminLlmResult = {
      fillPercentage: llmResult.fillPercentage,
      confidence: llmResult.confidence,
      provider: llmResult.provider,
      rerunAt,
    };

    await putMetadata(c.env, scanId, metadata);

    console.log(
      `[${requestId}] LLM re-run completed for scan ${scanId}: ${llmResult.fillPercentage}% (${llmResult.provider})`
    );

    return c.json({
      adminLlmResult: {
        fillPercentage: llmResult.fillPercentage,
        confidence: llmResult.confidence,
        provider: llmResult.provider,
        rerunAt,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Admin rerun LLM error:`, error);
    return c.json(
      {
        error: "Failed to re-run LLM",
        code: "INTERNAL_ERROR",
        requestId,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
