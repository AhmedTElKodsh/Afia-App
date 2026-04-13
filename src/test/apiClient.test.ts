import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { analyzeBottle, submitFeedback } from "../api/apiClient.ts";

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("analyzeBottle", () => {
    it("should successfully analyze a bottle", async () => {
      const mockResponse = {
        scanId: "test-scan-id",
        fillPercentage: 75,
        confidence: "high" as const,
        aiProvider: "gemini" as const,
        latencyMs: 1234,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await analyzeBottle("filippo-berio-500ml", "base64data");

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8787/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: "filippo-berio-500ml",
            imageBase64: "base64data",
          }),
          signal: expect.any(AbortSignal),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it("should throw error on failed analysis with error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid SKU" }),
      });

      await expect(analyzeBottle("invalid-sku", "base64data")).rejects.toThrow(
        "Invalid SKU",
      );
    });

    it("should throw error on failed analysis without error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(
        analyzeBottle("filippo-berio-500ml", "base64data"),
      ).rejects.toThrow("Analysis failed (500)");
    });

    it("should handle JSON parse error in error response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(
        analyzeBottle("filippo-berio-500ml", "base64data"),
      ).rejects.toThrow("Analysis failed (503)");
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        analyzeBottle("filippo-berio-500ml", "base64data"),
      ).rejects.toThrow("Network error");
    });
  });

  describe("submitFeedback", () => {
    it("should successfully submit feedback", async () => {
      const mockResponse = {
        feedbackId: "test-feedback-id",
        validationStatus: "accepted",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await submitFeedback(
        "test-scan-id",
        "about_right",
        75,
        80,
        5000,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8787/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scanId: "test-scan-id",
            accuracyRating: "about_right",
            llmFillPercentage: 75,
            correctedFillPercentage: 80,
            responseTimeMs: 5000,
          }),
          signal: expect.any(AbortSignal),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it("should submit feedback without optional parameters", async () => {
      const mockResponse = {
        feedbackId: "test-feedback-id",
        validationStatus: "accepted",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await submitFeedback("test-scan-id", "too_high", 85);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8787/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scanId: "test-scan-id",
            accuracyRating: "too_high",
            llmFillPercentage: 85,
          }),
          signal: expect.any(AbortSignal),
        },
      );

      expect(result).toEqual(mockResponse);
    });

    it("should throw error on failed feedback submission", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid scan ID" }),
      });

      await expect(
        submitFeedback("invalid-id", "about_right", 75),
      ).rejects.toThrow("Invalid scan ID");
    });

    it("should throw error on failed feedback without error message", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(
        submitFeedback("test-scan-id", "about_right", 75),
      ).rejects.toThrow("Feedback submission failed (500)");
    });

    it("should handle network errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        submitFeedback("test-scan-id", "about_right", 75),
      ).rejects.toThrow("Network error");
    });
  });
});
