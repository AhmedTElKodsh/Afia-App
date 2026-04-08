import type { LLMResponse } from "../types.ts";
import type { BottleEntry } from "../bottleRegistry.ts";
import { parseLLMResponse } from "./parseLLMResponse.ts";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
// pixtral-12b-2409 is Mistral's vision-capable model
const MODEL = "pixtral-12b-2409";

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

export async function callMistral(
  imageBase64: string,
  bottle: BottleEntry,
  apiKey: string,
  debugReasoning = false
): Promise<LLMResponse> {
  const userText = `Bottle: ${bottle.name} (${bottle.sku}), ${bottle.totalVolumeMl}ml, shape=${bottle.geometry.shape}. Return JSON fill estimate.`;

  const requestBody = {
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(debugReasoning) },
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
    max_tokens: 200,
    response_format: { type: "json_object" },
  };

  const res = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mistral API error ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Mistral returned empty response");

  return parseLLMResponse(content);
}
