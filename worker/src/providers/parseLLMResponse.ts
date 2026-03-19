import type { LLMResponse } from "../types.ts";

export function parseLLMResponse(raw: string): LLMResponse {
  const parsed = JSON.parse(raw) as Record<string, unknown>;

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
      ? (parsed.imageQualityIssues as string[])
      : [],
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
  };
}
