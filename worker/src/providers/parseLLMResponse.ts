import type { LLMResponse } from "../types.ts";

export function parseLLMResponse(raw: string): LLMResponse {
  // Extract JSON from markdown code fences if present (some models wrap their
  // output in ``` blocks, with or without a language tag, with or without prose
  // preamble before the fence). The non-greedy capture handles nested fences.
  const fenceMatch = raw.trim().match(/```[\w]*\s*([\s\S]*?)\s*```/);
  const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim();
  if (!cleaned) {
    throw new Error('Empty LLM response after fence stripping');
  }
  const raw_parsed: unknown = JSON.parse(cleaned);
  if (typeof raw_parsed !== 'object' || raw_parsed === null || Array.isArray(raw_parsed)) {
    throw new Error('LLM response is not a JSON object');
  }
  const parsed = raw_parsed as Record<string, unknown>;

  if (
    typeof parsed.fillPercentage !== "number" ||
    parsed.fillPercentage < 0 ||
    parsed.fillPercentage > 100
  ) {
    throw new Error("Invalid fillPercentage in LLM response");
  }

  if (!["high", "medium", "low"].includes(parsed.confidence as string)) {
    throw new Error("Invalid confidence in LLM response");
  }

  return {
    fillPercentage: Math.round(parsed.fillPercentage as number),
    confidence: parsed.confidence as "high" | "medium" | "low",
    imageQualityIssues: Array.isArray(parsed.imageQualityIssues)
      ? (parsed.imageQualityIssues as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
  };
}
