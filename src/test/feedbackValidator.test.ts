import { describe, it, expect } from "vitest";
import { validateFeedback } from "../utils/feedbackValidator.ts";

describe("validateFeedback", () => {
  const baseFeedback = {
    accuracyRating: "about_right" as const,
    responseTimeMs: 5000,
    correctedFillPercentage: undefined as number | undefined,
  };

  it("accepts clean about_right feedback", () => {
    const result = validateFeedback(50, baseFeedback);
    expect(result.validationStatus).toBe("accepted");
    expect(result.validationFlags).toHaveLength(0);
    expect(result.trainingEligible).toBe(true);
  });

  it("flags too_fast responses (< 3000ms)", () => {
    const result = validateFeedback(50, { ...baseFeedback, responseTimeMs: 1500 });
    expect(result.validationFlags).toContain("too_fast");
    expect(result.validationStatus).toBe("flagged");
    expect(result.trainingEligible).toBe(false);
  });

  it("does not flag responses exactly at 3000ms", () => {
    const result = validateFeedback(50, { ...baseFeedback, responseTimeMs: 3000 });
    expect(result.validationFlags).not.toContain("too_fast");
  });

  it("flags boundary value 0", () => {
    const result = validateFeedback(50, {
      ...baseFeedback,
      accuracyRating: "too_low",
      correctedFillPercentage: 0,
    });
    expect(result.validationFlags).toContain("boundary_value");
  });

  it("flags boundary value 100", () => {
    const result = validateFeedback(50, {
      ...baseFeedback,
      accuracyRating: "too_high",
      correctedFillPercentage: 100,
    });
    expect(result.validationFlags).toContain("boundary_value");
  });

  it("flags contradictory: too_low with corrected < llm estimate", () => {
    const result = validateFeedback(60, {
      ...baseFeedback,
      accuracyRating: "too_low",
      correctedFillPercentage: 40,
    });
    expect(result.validationFlags).toContain("contradictory");
  });

  it("flags contradictory: too_high with corrected > llm estimate", () => {
    const result = validateFeedback(40, {
      ...baseFeedback,
      accuracyRating: "too_high",
      correctedFillPercentage: 70,
    });
    expect(result.validationFlags).toContain("contradictory");
  });

  it("flags extreme_delta (> 30% difference)", () => {
    const result = validateFeedback(50, {
      ...baseFeedback,
      accuracyRating: "too_high",
      correctedFillPercentage: 15,
    });
    expect(result.validationFlags).toContain("extreme_delta");
  });

  it("does not flag delta at exactly 30", () => {
    const result = validateFeedback(50, {
      ...baseFeedback,
      accuracyRating: "too_high",
      correctedFillPercentage: 20,
    });
    expect(result.validationFlags).not.toContain("extreme_delta");
  });

  it("confidence weight decreases with flags", () => {
    const clean = validateFeedback(50, baseFeedback);
    const flagged = validateFeedback(50, { ...baseFeedback, responseTimeMs: 500 });
    expect(clean.confidenceWeight).toBe(1.0);
    expect(flagged.confidenceWeight).toBeLessThan(1.0);
  });

  it("confidence weight has minimum of 0.1", () => {
    const result = validateFeedback(50, {
      accuracyRating: "too_low",
      responseTimeMs: 100,
      correctedFillPercentage: 0,
    });
    expect(result.confidenceWeight).toBeGreaterThanOrEqual(0.1);
  });
});
