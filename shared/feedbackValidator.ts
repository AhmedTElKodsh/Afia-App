export interface FeedbackInput {
  accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
  responseTimeMs?: number;
  correctedFillPercentage?: number;
}

export interface ValidationResult {
  validationStatus: "accepted" | "flagged";
  validationFlags: string[];
  confidenceWeight: number;
  trainingEligible: boolean;
}

/**
 * Validates user feedback against LLM prediction to filter out
 * contradictory or low-quality data for future training.
 */
export function validateFeedback(
  llmFillPercentage: number,
  feedback: FeedbackInput
): ValidationResult {
  const flags: string[] = [];

  // Normalise correctedFillPercentage: reject NaN, Infinity, and out-of-range values.
  // Treat them as if no correction was provided to avoid poisoning training data.
  const correctedFill =
    feedback.correctedFillPercentage !== undefined &&
    Number.isFinite(feedback.correctedFillPercentage) &&
    feedback.correctedFillPercentage >= 0 &&
    feedback.correctedFillPercentage <= 100
      ? feedback.correctedFillPercentage
      : undefined;
  
  const normalizedFeedback = { ...feedback, correctedFillPercentage: correctedFill };

  if (normalizedFeedback.responseTimeMs !== undefined && normalizedFeedback.responseTimeMs < 3000) {
    flags.push("too_fast");
  }

  if (
    normalizedFeedback.correctedFillPercentage !== undefined &&
    (normalizedFeedback.correctedFillPercentage === 0 ||
      normalizedFeedback.correctedFillPercentage === 100)
  ) {
    flags.push("boundary_value");
  }

  if (
    normalizedFeedback.accuracyRating === "too_low" &&
    normalizedFeedback.correctedFillPercentage !== undefined &&
    normalizedFeedback.correctedFillPercentage <= llmFillPercentage
  ) {
    flags.push("contradictory");
  }

  if (
    normalizedFeedback.accuracyRating === "too_high" &&
    normalizedFeedback.correctedFillPercentage !== undefined &&
    normalizedFeedback.correctedFillPercentage >= llmFillPercentage
  ) {
    flags.push("contradictory");
  }

  if (
    normalizedFeedback.correctedFillPercentage !== undefined &&
    Math.abs(normalizedFeedback.correctedFillPercentage - llmFillPercentage) > 30
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
