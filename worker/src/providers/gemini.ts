import type { LLMResponse } from "../types.ts";
import type { BottleEntry } from "../bottleRegistry.ts";
import { parseLLMResponse } from "./parseLLMResponse.ts";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash-latest";

function buildSystemPrompt(debugReasoning: boolean): string {
  const schema = debugReasoning
    ? `{"fillPercentage":<0-100>,"confidence":"<high|medium|low>","imageQualityIssues":[<strings>],"reasoning":"<brief>"}`
    : `{"fillPercentage":<0-100>,"confidence":"<high|medium|low>","imageQualityIssues":[<strings>]}`;
  return `You are a CV system estimating cooking oil fill levels from bottle images.

Analyze the image and return this JSON:
${schema}

Rules:
- fillPercentage: visible liquid height / total bottle height × 100. Account for meniscus. Exclude cap and label.
- confidence: "high"=clear+well-lit, "medium"=acceptable, "low"=poor quality
- imageQualityIssues: list any of: blur, poor_lighting, obstruction, reflection`;
}

export async function callGemini(
  imageBase64: string,
  bottle: BottleEntry,
  apiKeys: string[],
  debugReasoning = false
): Promise<LLMResponse> {
  const userMessage = `Bottle: ${bottle.name} (${bottle.sku}), ${bottle.totalVolumeMl}ml, shape=${bottle.geometry.shape}. Return JSON fill estimate.`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: buildSystemPrompt(debugReasoning) }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userMessage },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 0,
      },
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
