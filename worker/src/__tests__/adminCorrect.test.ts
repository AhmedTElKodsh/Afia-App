/**
 * Admin Correction Handler Tests
 * Story 7.7 - Admin Correction Feedback Loop
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleAdminCorrect } from "../adminCorrect";
import * as r2Client from "../storage/r2Client";
import * as supabaseClient from "../storage/supabaseClient";
import * as admin from "../admin";

// Mock the storage clients
vi.mock("../storage/r2Client.ts");
vi.mock("../storage/supabaseClient.ts");
vi.mock("../admin.ts", () => ({
  verifyAdminSession: vi.fn(),
  handleGetScans: vi.fn(),
}));

describe("adminCorrect", () => {
  const mockEnv = {
    ADMIN_PASSWORD: "test-password",
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_KEY: "test-key",
  };

  const mockRequest = (body: any, token = "valid-token") =>
    new Request("https://example.com/admin/correct", {
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

  describe("handleAdminCorrect", () => {
    it('marks scan as training-eligible when accuracy is "correct"', async () => {
      // Test AC2: "Correct" marks training-eligible with no correction entry
      const mockMetadata = {
        scanId: "scan-123",
        sku: "afia-1l",
        fillPercentage: 75,
        confidence: "high" as const,
        aiProvider: "gemini" as const,
      };

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);
      vi.spyOn(supabaseClient, "upsertTrainingSample").mockResolvedValue(undefined);

      const request = mockRequest({
        scanId: "scan-123",
        accuracy: "correct",
      });

      const response = await handleAdminCorrect(mockContext(request, mockEnv));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.trainingEligible).toBe(true);

      // Verify metadata was updated with trainingEligible but no adminCorrection
      expect(r2Client.putMetadata).toHaveBeenCalledWith(
        "scan-123",
        expect.objectContaining({
          trainingEligible: true,
        })
      );

      // Verify no adminCorrection was added
      const putMetadataCall = vi.mocked(r2Client.putMetadata).mock.calls[0];
      expect(putMetadataCall[1]).not.toHaveProperty("adminCorrection");

      // Verify training sample was upserted
      expect(supabaseClient.upsertTrainingSample).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: "scan-123",
          confirmedFillPct: 75,
          labelSource: "admin_correction",
          labelConfidence: 1.0,
        })
      );
    });

    it("saves manual correction to metadata and Supabase", async () => {
      // Test AC4: Manual correction saves to R2 + Supabase
      const mockMetadata = {
        scanId: "scan-456",
        sku: "afia-1l",
        fillPercentage: 75,
        confidence: "medium" as const,
        aiProvider: "groq" as const,
      };

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);
      vi.spyOn(supabaseClient, "upsertTrainingSample").mockResolvedValue(undefined);

      const request = mockRequest({
        scanId: "scan-456",
        accuracy: "too_small",
        correctedFillPct: 85,
        method: "manual",
      });

      const response = await handleAdminCorrect(mockContext(request, mockEnv));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.trainingEligible).toBe(true);

      // Verify metadata includes adminCorrection
      expect(r2Client.putMetadata).toHaveBeenCalledWith(
        "scan-456",
        expect.objectContaining({
          trainingEligible: true,
          adminCorrection: expect.objectContaining({
            correctedFillPct: 85,
            by: "admin",
            method: "manual",
          }),
        })
      );

      // Verify training sample uses corrected value
      expect(supabaseClient.upsertTrainingSample).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: "scan-456",
          confirmedFillPct: 85,
          labelSource: "admin_correction",
          labelConfidence: 1.0,
        })
      );
    });

    it("upserts training_samples without duplicating", async () => {
      // Test AC7: Supabase upsert on correction
      const mockMetadata = {
        scanId: "scan-789",
        sku: "afia-1l",
        fillPercentage: 50,
        confidence: "low" as const,
        aiProvider: "gemini" as const,
      };

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);
      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);
      vi.spyOn(supabaseClient, "upsertTrainingSample").mockResolvedValue(undefined);

      // First correction
      const request1 = mockRequest({
        scanId: "scan-789",
        accuracy: "too_big",
        correctedFillPct: 40,
        method: "manual",
      });

      await handleAdminCorrect(mockContext(request1, mockEnv));

      // Second correction (should upsert, not duplicate)
      const request2 = mockRequest({
        scanId: "scan-789",
        accuracy: "way_off",
        correctedFillPct: 35,
        method: "manual",
      });

      await handleAdminCorrect(mockContext(request2, mockEnv));

      // Verify upsertTrainingSample was called twice with same scanId
      expect(supabaseClient.upsertTrainingSample).toHaveBeenCalledTimes(2);
      const calls = vi.mocked(supabaseClient.upsertTrainingSample).mock.calls;
      expect(calls[0][0].scanId).toBe("scan-789");
      expect(calls[1][0].scanId).toBe("scan-789");
    });

    it("validates correctedFillPct is between 1 and 99", async () => {
      // Test validation logic
      const mockMetadata = {
        scanId: "scan-invalid",
        sku: "afia-1l",
        fillPercentage: 50,
        confidence: "medium" as const,
        aiProvider: "gemini" as const,
      };

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);

      // Test invalid value (0)
      const request1 = mockRequest({
        scanId: "scan-invalid",
        accuracy: "too_small",
        correctedFillPct: 0,
        method: "manual",
      });

      const response1 = await handleAdminCorrect(mockContext(request1, mockEnv));
      expect(response1.status).toBe(400);

      // Test invalid value (100)
      const request2 = mockRequest({
        scanId: "scan-invalid",
        accuracy: "too_big",
        correctedFillPct: 100,
        method: "manual",
      });

      const response2 = await handleAdminCorrect(mockContext(request2, mockEnv));
      expect(response2.status).toBe(400);

      // Test valid value (50)
      const request3 = mockRequest({
        scanId: "scan-invalid",
        accuracy: "too_small",
        correctedFillPct: 50,
        method: "manual",
      });

      vi.spyOn(r2Client, "putMetadata").mockResolvedValue(undefined);
      vi.spyOn(supabaseClient, "upsertTrainingSample").mockResolvedValue(undefined);

      const response3 = await handleAdminCorrect(mockContext(request3, mockEnv));
      expect(response3.status).toBe(200);
    });

    it("requires admin authentication", async () => {
      // Test auth requirement
      const request = mockRequest(
        {
          scanId: "scan-123",
          accuracy: "correct",
        },
        "invalid-token"
      );

      const response = await handleAdminCorrect(mockContext(request, mockEnv));
      expect(response.status).toBe(401);
    });

    it("returns 404 when scan not found", async () => {
      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(null);

      const request = mockRequest({
        scanId: "nonexistent-scan",
        accuracy: "correct",
      });

      const response = await handleAdminCorrect(mockContext(request, mockEnv));
      expect(response.status).toBe(404);
    });

    it("requires correctedFillPct for non-correct accuracy", async () => {
      const mockMetadata = {
        scanId: "scan-123",
        sku: "afia-1l",
        fillPercentage: 50,
        confidence: "medium" as const,
        aiProvider: "gemini" as const,
      };

      vi.spyOn(r2Client, "getMetadata").mockResolvedValue(mockMetadata);

      const request = mockRequest({
        scanId: "scan-123",
        accuracy: "too_small",
        // Missing correctedFillPct
      });

      const response = await handleAdminCorrect(mockContext(request, mockEnv));
      expect(response.status).toBe(400);
    });
  });
});
