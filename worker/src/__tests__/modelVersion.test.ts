/**
 * Model Version Endpoint Tests
 * Story 7.5 - Task 1
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleModelVersion } from "../modelVersion";
import { createClient } from "@supabase/supabase-js";

// Mock Supabase
vi.mock("@supabase/supabase-js");

describe("handleModelVersion", () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      env: {
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "test-key",
      },
      get: vi.fn((key: string) => {
        if (key === "requestId") return "test-request-123";
        return undefined;
      }),
      json: vi.fn((data: any, status?: number, headers?: any) => {
        return new Response(JSON.stringify(data), {
          status: status || 200,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
        });
      }),
    };
  });

  it("should return active model version with cache headers", async () => {
    const mockData = {
      version: "1.2.0",
      mae: 0.087,
      training_samples_count: 1250,
      r2_key: "models/fill-regressor/v1.2.0/model.json",
      deployed_at: "2026-04-15T10:00:00Z",
    };

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

    const response = await handleModelVersion(mockContext);
    const responseData = await response.json();

    expect(responseData).toEqual({
      version: "1.2.0",
      mae: 0.087,
      trainingCount: 1250,
      r2Key: "models/fill-regressor/v1.2.0/model.json",
      deployedAt: "2026-04-15T10:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect(response.headers.get("X-RequestId")).toBe("test-request-123");
  });

  it("should return 404 when no active version exists", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

    const response = await handleModelVersion(mockContext);
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(responseData.error).toBe("No active model version");
    expect(responseData.code).toBe("NO_ACTIVE_VERSION");
  });

  it("should return 500 on database error", async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "Database connection failed" },
              })
            ),
          })),
        })),
      })),
    };

    (createClient as any).mockReturnValue(mockSupabase);

    const response = await handleModelVersion(mockContext);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.error).toBe("Failed to fetch model version");
    expect(responseData.code).toBe("DATABASE_ERROR");
  });

  it("should handle unexpected errors gracefully", async () => {
    (createClient as any).mockImplementation(() => {
      throw new Error("Unexpected error");
    });

    const response = await handleModelVersion(mockContext);
    const responseData = await response.json();

    expect(response.status).toBe(500);
    expect(responseData.error).toBe("Internal server error");
    expect(responseData.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
