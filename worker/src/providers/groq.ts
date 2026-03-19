import type { LLMResponse } from "../types.ts";
import type { BottleEntry } from "../bottleRegistry.ts";
import { parseLLMResponse } from "./parseLLMResponse.ts";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You are a computer vision expert analyzing cooking oil bottles to estimate fill levels.

Task: Estimate the remaining oil as a percentage (0-100%) where 0% is empty and 100% is full.

Consider:
- Visible liquid level relative to total bottle height
- Meniscus curve at oil surface
- Ignore cap, label, external features

Assess confidence:
- "high": Clear view, good lighting
- "medium": Acceptable quality
- "low": Poor quality, recommend retake

Identify image quality issues: blur, poor_lighting, obstruction, reflection

Return JSON:
{
  "fillPercentage": <0-100>,
  "confidence": "<high|medium|low>",
  "imageQualityIssues": [<optional strings>],
  "reasoning": "<brief explanation>"
}`;

export async function callGroq(
  imageBase64: string,
  bottle: BottleEntry,
  apiKey: string
): Promise<LLMResponse> {
  const userText = `Analyze this oil bottle image.

Context:
- SKU: ${bottle.sku}
- Bottle: ${bottle.name}
- Capacity: ${bottle.totalVolumeMl}ml
- Shape: ${bottle.geometry.shape}

Estimate fill level as JSON.`;

  const requestBody = {
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" },
  };

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    choices?: Array<{
      message?: { content?: string };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty response");
  }

  return parseLLMResponse(content);
}

