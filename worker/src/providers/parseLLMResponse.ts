import type { LLMResponse } from "../types.ts";
import { LLMEmptyResponseError, LLMInvalidFormatError } from "../utils/errors.ts";

export function parseLLMResponse(raw: string): LLMResponse {
  // Extract JSON from markdown code fences if present. Use the LAST fence when
  // multiple are present — models sometimes emit an example fence before the
  // real answer fence.
  const fenceMatches = [...raw.trim().matchAll(/```[\w]*\s*([\s\S]*?)\s*```/g)];
  const fenceMatch = fenceMatches.length > 0 ? fenceMatches[fenceMatches.length - 1] : null;
  const cleaned = (fenceMatch ? fenceMatch[1] : raw).trim();
  if (!cleaned) {
    throw new LLMEmptyResponseError();
  }
  const raw_parsed: unknown = JSON.parse(cleaned);
  if (typeof raw_parsed !== 'object' || raw_parsed === null || Array.isArray(raw_parsed)) {
    throw new LLMInvalidFormatError('LLM response is not a JSON object');
  }
  const parsed = raw_parsed as Record<string, unknown>;

  if (
    typeof parsed.fillPercentage !== "number" ||
    parsed.fillPercentage < 0 ||
    parsed.fillPercentage > 100
  ) {
    throw new LLMInvalidFormatError("Invalid fillPercentage in LLM response");
  }

  if (!["high", "medium", "low"].includes(parsed.confidence as string)) {
    throw new LLMInvalidFormatError("Invalid confidence in LLM response");
  }

  const result: LLMResponse = {
    brand: parsed.brand === "Afia" ? "Afia" : "unknown",
    fillPercentage: Math.round(parsed.fillPercentage as number),
    confidence: parsed.confidence as "high" | "medium" | "low",
    imageQualityIssues: Array.isArray(parsed.imageQualityIssues)
      ? (parsed.imageQualityIssues as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
    red_line_y_normalized: typeof parsed.red_line_y_normalized === "number" &&
      parsed.red_line_y_normalized >= 0 && parsed.red_line_y_normalized <= 1000
      ? parsed.red_line_y_normalized : undefined,
    // C5: scan all keys for the dynamic below_*ml_threshold field emitted by buildAnalysisPrompt
    below_55ml_threshold: (() => {
      const key = Object.keys(parsed).find(k => /^below_\d+ml_threshold$/.test(k));
      return key && typeof parsed[key] === "boolean" ? parsed[key] as boolean : undefined;
    })(),
    guidanceNeeded: typeof parsed.guidance_needed === "string" ? parsed.guidance_needed : null,
  };

  // --- SANITY CHECK: red_line_y_normalized vs fillPercentage ---
  // red_line_y_normalized: 0 (top) to 1000 (bottom)
  // fillPercentage: 0 (bottom/empty) to 100 (top/full)
  // Inverse relationship: High Y (bottom) should mean Low fill %
  if (result.red_line_y_normalized !== undefined) {
    const y_pct = result.red_line_y_normalized / 10; // 0-100 scale (top to bottom)
    const expected_fill = 100 - y_pct; // 0-100 scale (bottom to top)
    
    // If delta is > 25%, flag it or adjust.
    // For robustness, if they are wildly contradictory, we lean towards lower confidence.
    if (Math.abs(result.fillPercentage - expected_fill) > 25) {
      result.confidence = "low";
    }
  }

  return result;
}
