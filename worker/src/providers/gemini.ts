import type { LLMResponse } from "../types.ts";
import type { BottleEntry } from "../bottleRegistry.ts";
import { parseLLMResponse } from "./parseLLMResponse.ts";
import { buildGeminiFewShotParts } from "../referenceFrames.ts";
import { buildAnalysisPrompt } from "./buildAnalysisPrompt.ts";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
// gemini-2.0-flash was deprecated April 2026 — gemini-2.5-flash is the
// recommended price/performance replacement on the v1beta endpoint.
const MODEL = "gemini-2.5-flash";


export async function callGemini(
  imageBase64: string,
  bottle: BottleEntry,
  apiKeys: string[],
  debugReasoning = false
): Promise<LLMResponse> {
  const userMessage = `Bottle: ${bottle.name} (${bottle.sku}), ${bottle.totalVolumeMl}ml total. Return JSON fill estimate.`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: buildAnalysisPrompt(debugReasoning, bottle.promptAnchors) }],
    },
    contents: [
      {
        role: "user",
        parts: [
          ...buildGeminiFewShotParts(),
          { text: "Now estimate the fill level for THIS bottle:" },
          { text: userMessage },
          { inline_data: { mime_type: "image/jpeg" as const, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      // Disable thinking tokens — on by default in gemini-2.5-flash and can
      // exceed Cloudflare Workers' 30 s CPU limit, causing the whole chain to fail.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  // Try each API key sequentially until one succeeds
  const errors: Error[] = [];
  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${text}`);
      }

      const data = await res.json() as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini returned empty response");
      }

      return parseLLMResponse(text);
    } catch (error) {
      errors.push(error as Error);
      console.warn(`Gemini key ${i + 1} failed, trying next key...`, error);

      // If this was the last key, throw with all errors
      if (i === apiKeys.length - 1) {
        console.error(`All ${apiKeys.length} Gemini keys failed:`, errors);
        throw new Error(`All Gemini API keys failed. Last error: ${errors[errors.length - 1].message}`);
      }
    }
  }

  throw new Error("All Gemini API keys failed");
}
