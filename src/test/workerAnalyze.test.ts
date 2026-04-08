import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAnalyze } from "../../worker/src/analyze.ts";

// Mock all external dependencies from the worker
vi.mock("../../worker/src/providers/gemini.ts", () => ({
  callGemini: vi.fn(),
}));
vi.mock("../../worker/src/providers/groq.ts", () => ({
  callGroq: vi.fn(),
}));
vi.mock("../../worker/src/providers/openrouter.ts", () => ({
  callOpenRouter: vi.fn(),
}));
vi.mock("../../worker/src/providers/mistral.ts", () => ({
  callMistral: vi.fn(),
}));
vi.mock("../../worker/src/storage/supabaseClient.ts", () => ({
  storeScan: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../worker/src/monitoring/logger.ts", () => ({
  MonitoringLogger: vi.fn().mockImplementation(function () {
    return {
      info: vi.fn().mockResolvedValue(undefined),
      warn: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));
vi.mock("../../worker/src/monitoring/quotaMonitor.ts", () => ({
  QuotaMonitor: vi.fn().mockImplementation(function () {
    return { trackRequest: vi.fn().mockResolvedValue(undefined) };
  }),
}));

import { callGemini } from "../../worker/src/providers/gemini.ts";
import { callGroq } from "../../worker/src/providers/groq.ts";

const VALID_SKU = "afia-corn-1.5l";
// 1-byte base64 string well under the 4MB limit
const SMALL_IMAGE = "dGVzdA==";
// Just over 4MB in base64 chars
const LARGE_IMAGE = "x".repeat(4 * 1024 * 1024 + 1);

function mockKV(cached: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(cached),
    put: vi.fn().mockResolvedValue(undefined),
  };
}

function createCtx(
  body: Record<string, unknown>,
  kvValue: string | null = null,
  envOverrides: Record<string, unknown> = {},
) {
  const responses: Array<{ data: unknown; status: number }> = [];
  return {
    req: { json: vi.fn().mockResolvedValue(body) },
    env: {
      RATE_LIMIT_KV: mockKV(kvValue),
      BETTERSTACK_TOKEN: undefined,
      DEBUG_REASONING: "false",
      GEMINI_API_KEY: "test-gemini-key",
      ALLOWED_ORIGINS: "*",
      ...envOverrides,
    },
    executionCtx: { waitUntil: vi.fn() },
    json: vi.fn().mockImplementation((data: unknown, status = 200) => {
      responses.push({ data, status });
      return new Response(JSON.stringify(data), { status });
    }),
    _responses: responses,
  };
}

describe("handleAnalyze — request validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when sku is missing", async () => {
    const ctx = createCtx({ imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when sku is empty string", async () => {
    const ctx = createCtx({ sku: "", imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when imageBase64 is missing", async () => {
    const ctx = createCtx({ sku: VALID_SKU });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when imageBase64 is empty string", async () => {
    const ctx = createCtx({ sku: VALID_SKU, imageBase64: "" });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when image exceeds 4MB", async () => {
    const ctx = createCtx({ sku: VALID_SKU, imageBase64: LARGE_IMAGE });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "IMAGE_TOO_LARGE" }),
      400,
    );
  });

  it("returns 400 when SKU is unknown", async () => {
    const ctx = createCtx({ sku: "unknown-sku-xyz", imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "UNKNOWN_SKU" }),
      400,
    );
  });
});

describe("handleAnalyze — cache hit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached result without calling LLM providers", async () => {
    const cachedPayload = {
      llmResult: { fillPercentage: 60, confidence: "high", imageQualityIssues: [] },
      aiProvider: "gemini",
    };
    const ctx = createCtx(
      { sku: VALID_SKU, imageBase64: SMALL_IMAGE },
      JSON.stringify(cachedPayload),
    );
    await handleAnalyze(ctx as never);

    expect(callGemini).not.toHaveBeenCalled();
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ cacheHit: true, fillPercentage: 60 }),
    );
  });
});

describe("handleAnalyze — successful analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (callGemini as ReturnType<typeof vi.fn>).mockResolvedValue({
      fillPercentage: 75,
      confidence: "high",
      imageQualityIssues: [],
    });
  });

  it("returns 200 with expected fields on success", async () => {
    const ctx = createCtx({ sku: VALID_SKU, imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        fillPercentage: 75,
        confidence: "high",
        aiProvider: "gemini",
        cacheHit: false,
      }),
    );
  });

  it("response includes scanId and remainingMl", async () => {
    const ctx = createCtx({ sku: VALID_SKU, imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData).toHaveProperty("scanId");
    expect(responseData).toHaveProperty("remainingMl");
    expect(typeof responseData.scanId).toBe("string");
    expect(typeof responseData.remainingMl).toBe("number");
  });

  it("stores result in KV cache via waitUntil", async () => {
    const ctx = createCtx({ sku: VALID_SKU, imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);
    expect(ctx.executionCtx.waitUntil).toHaveBeenCalled();
  });
});

describe("handleAnalyze — provider fallback chain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (callGemini as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Gemini quota exceeded"));
  });

  it("returns 503 when all providers fail (no fallback keys configured)", async () => {
    const ctx = createCtx({ sku: VALID_SKU, imageBase64: SMALL_IMAGE });
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SERVICE_UNAVAILABLE" }),
      503,
    );
  });

  it("falls back to Groq when Gemini fails and GROQ_API_KEY is configured", async () => {
    (callGroq as ReturnType<typeof vi.fn>).mockResolvedValue({
      fillPercentage: 50,
      confidence: "medium",
      imageQualityIssues: [],
    });
    const ctx = createCtx(
      { sku: VALID_SKU, imageBase64: SMALL_IMAGE },
      null,
      { GROQ_API_KEY: "test-groq-key" },
    );
    await handleAnalyze(ctx as never);
    expect(callGroq).toHaveBeenCalled();
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ aiProvider: "groq", fillPercentage: 50 }),
    );
  });

  it("returns 503 when Gemini fails and Groq also throws an API error", async () => {
    (callGroq as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Groq 429 rate limit"));
    const ctx = createCtx(
      { sku: VALID_SKU, imageBase64: SMALL_IMAGE },
      null,
      { GROQ_API_KEY: "test-groq-key" },
    );
    await handleAnalyze(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SERVICE_UNAVAILABLE" }),
      503,
    );
  });
});
