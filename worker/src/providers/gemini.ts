import type { LLMResponse } from "../types.ts";
import type { BottleEntry } from "../bottleRegistry.ts";
import { parseLLMResponse } from "./parseLLMResponse.ts";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash-latest";

const SYSTEM_PROMPT = `You are an expert computer vision system specialized in analyzing cooking oil bottles to estimate fill levels.

Your task: Analyze the provided image of a clear glass oil bottle and estimate the remaining fill level as a percentage (0-100%).

Guidelines:
- 0% = completely empty bottle
- 100% = completely full bottle
- Estimate based on visible oil level relative to total bottle height
- Account for meniscus (curved surface) at the top of the oil
- Ignore bottle cap, label, or external features
- Focus only on the liquid level inside the bottle

Also assess:
- Confidence level: "high" (clear view, good lighting), "medium" (acceptable but not ideal), "low" (poor quality, recommend retake)
- Image quality issues: blur, poor lighting, obstruction, reflection, or other problems

Return your analysis as JSON with this exact structure:
{
  "fillPercentage": <number 0-100>,
  "confidence": "<high|medium|low>",
  "imageQualityIssues": [<optional array of strings>],
  "reasoning": "<brief explanation of your estimate>"
}`;

export async function callGemini(
  imageBase64: string,
  bottle: BottleEntry,
  apiKeys: string[]
): Promise<LLMResponse> {
  const userMessage = `Analyze this oil bottle image and estimate the fill level.

Bottle context:
- SKU: ${bottle.sku}
- Bottle type: ${bottle.name}
- Total capacity: ${bottle.totalVolumeMl}ml
- Shape: ${bottle.geometry.shape}

Provide your analysis as JSON.`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
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

