import { describe, it, expect } from "vitest";
import { parseLLMResponse } from "../../worker/src/providers/parseLLMResponse.ts";

describe("parseLLMResponse", () => {
  describe("happy path", () => {
    it("parses a valid high-confidence response", () => {
      const raw = JSON.stringify({ fillPercentage: 75, confidence: "high", imageQualityIssues: [] });
      const result = parseLLMResponse(raw);
      expect(result.fillPercentage).toBe(75);
      expect(result.confidence).toBe("high");
      expect(result.imageQualityIssues).toEqual([]);
    });

    it("parses medium confidence", () => {
      const raw = JSON.stringify({ fillPercentage: 50, confidence: "medium" });
      const result = parseLLMResponse(raw);
      expect(result.confidence).toBe("medium");
    });

    it("parses low confidence", () => {
      const raw = JSON.stringify({ fillPercentage: 10, confidence: "low" });
      expect(parseLLMResponse(raw).confidence).toBe("low");
    });

    it("rounds fillPercentage to integer", () => {
      const raw = JSON.stringify({ fillPercentage: 74.7, confidence: "high" });
      expect(parseLLMResponse(raw).fillPercentage).toBe(75);
    });

    it("accepts fillPercentage of 0", () => {
      const raw = JSON.stringify({ fillPercentage: 0, confidence: "low" });
      expect(parseLLMResponse(raw).fillPercentage).toBe(0);
    });

    it("accepts fillPercentage of 100", () => {
      const raw = JSON.stringify({ fillPercentage: 100, confidence: "high" });
      expect(parseLLMResponse(raw).fillPercentage).toBe(100);
    });

    it("includes imageQualityIssues array when present", () => {
      const raw = JSON.stringify({
        fillPercentage: 60,
        confidence: "low",
        imageQualityIssues: ["blurry", "dark"],
      });
      expect(parseLLMResponse(raw).imageQualityIssues).toEqual(["blurry", "dark"]);
    });

    it("returns empty array for imageQualityIssues when field absent", () => {
      const raw = JSON.stringify({ fillPercentage: 60, confidence: "high" });
      expect(parseLLMResponse(raw).imageQualityIssues).toEqual([]);
    });

    it("includes optional reasoning when present", () => {
      const raw = JSON.stringify({ fillPercentage: 42, confidence: "medium", reasoning: "bottle looks half full" });
      expect(parseLLMResponse(raw).reasoning).toBe("bottle looks half full");
    });

    it("reasoning is undefined when absent", () => {
      const raw = JSON.stringify({ fillPercentage: 42, confidence: "medium" });
      expect(parseLLMResponse(raw).reasoning).toBeUndefined();
    });
  });

  describe("validation errors", () => {
    it("throws on invalid JSON", () => {
      expect(() => parseLLMResponse("not json")).toThrow();
    });

    it("throws when fillPercentage is missing", () => {
      const raw = JSON.stringify({ confidence: "high" });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid fillPercentage");
    });

    it("throws when fillPercentage is a string", () => {
      const raw = JSON.stringify({ fillPercentage: "75", confidence: "high" });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid fillPercentage");
    });

    it("throws when fillPercentage is below 0", () => {
      const raw = JSON.stringify({ fillPercentage: -1, confidence: "high" });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid fillPercentage");
    });

    it("throws when fillPercentage is above 100", () => {
      const raw = JSON.stringify({ fillPercentage: 101, confidence: "high" });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid fillPercentage");
    });

    it("throws when confidence is missing", () => {
      const raw = JSON.stringify({ fillPercentage: 50 });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid confidence");
    });

    it("throws when confidence is an invalid value", () => {
      const raw = JSON.stringify({ fillPercentage: 50, confidence: "very_high" });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid confidence");
    });

    it("throws when confidence is null", () => {
      const raw = JSON.stringify({ fillPercentage: 50, confidence: null });
      expect(() => parseLLMResponse(raw)).toThrow("Invalid confidence");
    });
  });
});
