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
