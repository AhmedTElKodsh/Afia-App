import type { LLMResponse } from "../types.ts";
import type { BottleEntry } from "../bottleRegistry.ts";
import { parseLLMResponse } from "./parseLLMResponse.ts";
import { buildOpenAIFewShotParts } from "../referenceFrames.ts";
import { buildAnalysisPrompt } from "./buildAnalysisPrompt.ts";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
// pixtral-12b-2409 is Mistral's vision-capable model
const MODEL = "pixtral-12b-2409";

export async function callMistral(
  imageBase64: string,
  bottle: BottleEntry,
  apiKey: string,
  debugReasoning = false
): Promise<LLMResponse> {
  const userText = `Bottle: ${bottle.name} (${bottle.sku}), ${bottle.totalVolumeMl}ml total. Return JSON fill estimate.`;

  const requestBody = {
    model: MODEL,
    messages: [
      { role: "system", content: buildAnalysisPrompt(debugReasoning, bottle.promptAnchors) },
      {
        role: "user",
        content: [
          ...buildOpenAIFewShotParts(),
          { type: "text", text: "Now estimate the fill level for THIS bottle:" },
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
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
