import { z } from "zod";
import type { FeedbackInput, ValidationResult } from "./types/feedback.ts";

export type { FeedbackInput, ValidationResult };

/**
 * Zod schema for feedback input validation
 * Standardized using runtime validation for better reliability.
 */
export const FeedbackSchema = z.object({
  accuracyRating: z.enum(["about_right", "too_high", "too_low", "way_off"]),
  responseTimeMs: z.number().optional(),
  correctedFillPercentage: z.number().min(0).max(100).optional(),
});

/**
 * Validates user feedback against LLM prediction to filter out
 * contradictory or low-quality data for future training.
 */
export function validateFeedback(
  llmFillPercentage: number,
  feedback: unknown
): ValidationResult {
  const flags: string[] = [];

  // Runtime validation using Zod
  const parseResult = FeedbackSchema.safeParse(feedback);
  if (!parseResult.success) {
    return {
      validationStatus: "flagged",
      validationFlags: ["invalid_schema"],
      confidenceWeight: 0.1,
      trainingEligible: false,
    };
  }

  const data = parseResult.data;

  if (data.responseTimeMs !== undefined && data.responseTimeMs < 3000) {
    flags.push("too_fast");
  }

  if (
    data.correctedFillPercentage !== undefined &&
    (data.correctedFillPercentage === 0 || data.correctedFillPercentage === 100)
  ) {
    flags.push("boundary_value");
  }

  if (
    data.accuracyRating === "too_low" &&
    data.correctedFillPercentage !== undefined &&
    data.correctedFillPercentage <= llmFillPercentage
  ) {
    flags.push("contradictory");
  }

  if (
    data.accuracyRating === "too_high" &&
    data.correctedFillPercentage !== undefined &&
    data.correctedFillPercentage >= llmFillPercentage
  ) {
    flags.push("contradictory");
  }

  if (
    data.correctedFillPercentage !== undefined &&
    Math.abs(data.correctedFillPercentage - llmFillPercentage) > 30
  ) {
    flags.push("extreme_delta");
  }

  const confidenceWeight = Math.max(0.1, 1.0 - flags.length * 0.3);

  return {
    validationStatus: flags.length === 0 ? "accepted" : "flagged",
    validationFlags: flags,
    confidenceWeight,
    trainingEligible: flags.length === 0,
  };
}
