import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAnalyze } from "../analyze";
import { handleFeedback } from "../feedback";
import { callGemini } from "../providers/gemini";
import { storeScan, getSupabase, updateScanWithFeedback } from "../storage/supabaseClient";

// Mock dependencies
vi.mock("../providers/gemini");
vi.mock("../providers/groq");
vi.mock("../storage/supabaseClient");
vi.mock("../monitoring/logger");
vi.mock("../monitoring/quotaMonitor");

describe("API Integration Tests", () => {
  let mockContext: any;
  let mockEnv: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      GEMINI_API_KEY: "test-gemini-key",
      RATE_LIMIT_KV: {
        get: vi.fn(async () => null),
        put: vi.fn(async () => undefined),
      },
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
    };
    mockContext = {
      env: mockEnv,
      req: {
        json: vi.fn(),
      },
      json: vi.fn((data, status) => ({
        status: status || 200,
        json: async () => data,
      })),
      get: vi.fn((key) => {
        if (key === "requestId") return "test-id";
        return null;
      }),
      executionCtx: {
        waitUntil: vi.fn(),
      },
    };
  });

  describe("POST /analyze", () => {
    it("should return success when analysis succeeds", async () => {
      // Valid base64, over 100 characters
      const mockImage = "a".repeat(200);
      mockContext.req.json.mockResolvedValue({
        sku: "afia-corn-1.5l",
        imageBase64: mockImage,
      });

      (callGemini as any).mockResolvedValue({
        result: {
          fillPercentage: 75,
          confidence: "high",
          red_line_y_normalized: 0.25,
        },
        keyIndex: 0,
      });

      (storeScan as any).mockResolvedValue({ ok: true });

      const response = await handleAnalyze(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fillPercentage).toBe(75);
      expect(data.confidence).toBe("high");
      expect(data.aiProvider).toBe("gemini");
      expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
    });

    it("should return 400 when sku is missing", async () => {
      mockContext.req.json.mockResolvedValue({
        imageBase64: "some-base64",
      });

      const response = await handleAnalyze(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required field: sku");
    });

    it("should return 400 when image data is invalid", async () => {
      mockContext.req.json.mockResolvedValue({
        sku: "afia-corn-1.5l",
        imageBase64: "too-short",
      });

      const response = await handleAnalyze(mockContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid image data");
    });
  });

  describe("POST /feedback", () => {
    it("should return success when feedback is valid", async () => {
      const mockScanId = "test-scan-id";
      mockContext.req.json.mockResolvedValue({
        scanId: mockScanId,
        accuracyRating: "about_right",
        correctedFillPercentage: 75,
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { llm_fallback_prediction: { percentage: 75 } },
                error: null
              })),
            })),
          })),
        })),
      };
      (getSupabase as any).mockReturnValue(mockSupabase);
      (updateScanWithFeedback as any).mockResolvedValue({ ok: true });

      const response = await handleFeedback(mockContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.validationStatus).toBe("accepted");
      expect(mockContext.executionCtx.waitUntil).toHaveBeenCalled();
    });

    it("should return 404 when scan record is not found", async () => {
      mockContext.req.json.mockResolvedValue({
        scanId: "non-existent",
        accuracyRating: "about_right",
      });

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: "Not found" } })),
            })),
          })),
        })),
      };
      (getSupabase as any).mockReturnValue(mockSupabase);

      const response = await handleFeedback(mockContext);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Scan record not found");
    });
  });
});
