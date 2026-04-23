/**
 * Admin LLM Re-run Handler Tests
 * Story 7.7 - Admin Correction Feedback Loop
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleAdminRerunLlm } from "../adminRerunLlm";
import * as r2Client from "../storage/r2Client";
import * as admin from "../admin";

// Mock the storage clients
vi.mock("../storage/r2Client.ts");
vi.mock("../storage/supabaseClient.ts");
vi.mock("../admin.ts", () => ({
  verifyAdminSession: vi.fn(),
}));

// Mock fetch for LLM API calls
globalThis.fetch = vi.fn();

describe("adminRerunLlm", () => {
  const mockEnv = {
    ADMIN_PASSWORD: "test-password",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_KEY: "test-key",
    GEMINI_API_KEY: "gemini-key-1",
    GEMINI_API_KEY2: "gemini-key-2",
    GROQ_API_KEY: "groq-key",
  };

  const mockRequest = (body: any, token = "valid-token") =>
    new Request("https://example.com/admin/rerun-llm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

  const mockContext = (request: Request, env: any) => ({
    req: {
      raw: request,
      header: vi.fn((name: string) => request.headers.get(name)),
      json: () => request.json(),
    },
    env,
    get: vi.fn((key: string) => (key === "requestId" ? "test-req-id" : undefined)),
    json: vi.fn((data: any, status?: number) => new Response(JSON.stringify(data), { status: status || 200 })),
  } as any);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(admin.verifyAdminSession).mockImplementation(async (c: any) => {
      const auth = c.req.raw.headers.get("Authorization");
      return auth === "Bearer valid-token";
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleAdminRerunLlm", () => {
    it("re-calls LLM with key rotation", async () => {
      // Test AC5: LLM re-call with key rotation
      const mockMetadata = {
        scanId: "scan-123",
        sku: "afia-corn-1.5l",
        fillPercentage: 75,
        confidence: "high" as const,
        aiProvider: "gemini" as const,
        imageKey: "images/scan-123.jpg",
        timestamp: new Date().toISOString(),
      };

      const mockImageBuffer = new Uint8Array(new TextEncoder().encode("fake-image-data")).buffer as ArrayBuffer;

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "getImage").mockResolvedValue(mockImageBuffer);
      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);

      // Mock Gemini API response
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      fillPercentage: 80,
                      confidence: "high",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      const request = mockRequest({ scanId: "scan-123" });
      const response = await handleAdminRerunLlm(mockContext(request, mockEnv));
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.adminLlmResult).toBeDefined();
      expect(data.adminLlmResult.fillPercentage).toBe(80);
      expect(data.adminLlmResult.confidence).toBe("high");
      expect(data.adminLlmResult.provider).toContain("gemini");

      // Verify metadata was updated
      expect(r2Client.putMetadata).toHaveBeenCalledWith(
        mockEnv,
        "scan-123",
        expect.objectContaining({
          adminLlmResult: expect.objectContaining({
            fillPercentage: 80,
            confidence: "high",
          }),
        })
      );
    });

    it("stores result in adminLlmResult metadata", async () => {
      // Test result storage
      const mockMetadata = {
        scanId: "scan-456",
        sku: "afia-corn-1.5l",
        fillPercentage: 50,
        confidence: "medium" as const,
        aiProvider: "groq" as const,
        imageKey: "images/scan-456.jpg",
        timestamp: new Date().toISOString(),
      };

      const mockImageBuffer = new Uint8Array(new TextEncoder().encode("fake-image-data")).buffer as ArrayBuffer;

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "getImage").mockResolvedValue(mockImageBuffer);
      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);

      // Mock Gemini API response
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      fillPercentage: 55,
                      confidence: "medium",
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      const request = mockRequest({ scanId: "scan-456" });
      await handleAdminRerunLlm(mockContext(request, mockEnv));

      // Verify adminLlmResult structure
      const putMetadataCall = vi.mocked(r2Client.putMetadata).mock.calls[0];
      expect(putMetadataCall[2].adminLlmResult).toMatchObject({
        fillPercentage: 55,
        confidence: "medium",
        provider: expect.any(String),
        rerunAt: expect.any(String),
      });
    });

    it("falls back to Groq when Gemini fails", async () => {
      // Test fallback chain
      const mockMetadata = {
        scanId: "scan-789",
        sku: "afia-corn-1.5l",
        fillPercentage: 60,
        confidence: "low" as const,
        aiProvider: "gemini" as const,
        imageKey: "images/scan-789.jpg",
        timestamp: new Date().toISOString(),
      };

      const mockImageBuffer = new Uint8Array(new TextEncoder().encode("fake-image-data")).buffer as ArrayBuffer;

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "getImage").mockResolvedValue(mockImageBuffer);
      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);

      // Mock Gemini API failure
      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => "Too Many Requests",
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        } as Response)
        // Mock Groq API success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    fillPercentage: 65,
                    confidence: "medium",
                  }),
                },
              },
            ],
          }),
        } as Response);

      const request = mockRequest({ scanId: "scan-789" });
      const response = await handleAdminRerunLlm(mockContext(request, mockEnv));
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.adminLlmResult.provider).toContain("groq");
      expect(data.adminLlmResult.fillPercentage).toBe(65);
    });

    it("requires admin authentication", async () => {
      // Test auth requirement
      const request = mockRequest({ scanId: "scan-123" }, "invalid-token");

      const response = await handleAdminRerunLlm(mockContext(request, mockEnv));
      expect(response.status).toBe(401);
    });

    it("returns 404 when scan not found", async () => {
      // Test error handling
      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(null);

      const request = mockRequest({ scanId: "nonexistent-scan" });
      const response = await handleAdminRerunLlm(mockContext(request, mockEnv));

      expect(response.status).toBe(404);
    });

    it("returns 404 when image not found", async () => {
      const mockMetadata = {
        scanId: "scan-no-image",
        sku: "afia-corn-1.5l",
        fillPercentage: 50,
        confidence: "medium" as const,
        aiProvider: "gemini" as const,
        imageKey: "images/scan-no-image.jpg",
        timestamp: new Date().toISOString(),
      };

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "getImage").mockResolvedValue(null);

      const request = mockRequest({ scanId: "scan-no-image" });
      const response = await handleAdminRerunLlm(mockContext(request, mockEnv));

      expect(response.status).toBe(404);
    });

    it("returns 500 when all LLM providers fail", async () => {
      const mockMetadata = {
        scanId: "scan-all-fail",
        sku: "afia-corn-1.5l",
        fillPercentage: 50,
        confidence: "medium" as const,
        aiProvider: "gemini" as const,
        imageKey: "images/scan-all-fail.jpg",
        timestamp: new Date().toISOString(),
      };

      const mockImageBuffer = new Uint8Array(new TextEncoder().encode("fake-image-data")).buffer as ArrayBuffer;

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "getImage").mockResolvedValue(mockImageBuffer);

      // Mock all providers failing
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      } as Response);

      const request = mockRequest({ scanId: "scan-all-fail" });
      const response = await handleAdminRerunLlm(mockContext(request, mockEnv));

      expect(response.status).toBe(500);
    });
  });
});
