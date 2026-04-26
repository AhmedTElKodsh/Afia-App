import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFeedback } from "../../worker/src/feedback.ts";

vi.mock("../../worker/src/storage/supabaseClient.ts", () => ({
  storeScan: vi.fn().mockResolvedValue(undefined),
  updateScanWithFeedback: vi.fn().mockResolvedValue(undefined),
  getSupabase: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { llm_fallback_prediction: { percentage: 70 } }, error: null }),
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { fill_percentage: 70 }, error: null }),
  }),
}));

function createCtx(body: Record<string, unknown>) {
  return {
    req: { json: vi.fn().mockResolvedValue(body) },
    env: {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-key",
    },
    executionCtx: { waitUntil: vi.fn() },
    json: vi.fn().mockImplementation((data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status }),
    ),
    get: vi.fn().mockReturnValue("test-request-id"),
  };
}

const VALID_BODY = {
  scanId: "scan-abc-123",
  accuracyRating: "about_right",
  llmFillPercentage: 70,
  responseTimeMs: 5000,
};

describe("handleFeedback — request validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when scanId is missing", async () => {
    const ctx = createCtx({ ...VALID_BODY, scanId: undefined });
    await handleFeedback(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when scanId is empty string", async () => {
    const ctx = createCtx({ ...VALID_BODY, scanId: "" });
    await handleFeedback(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when accuracyRating is invalid", async () => {
    const ctx = createCtx({ ...VALID_BODY, accuracyRating: "not_valid" });
    await handleFeedback(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("returns 400 when accuracyRating is missing", async () => {
    const ctx = createCtx({ ...VALID_BODY, accuracyRating: undefined });
    await handleFeedback(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });

  it("accepts request when responseTimeMs is missing", async () => {
    const ctx = createCtx({ ...VALID_BODY, responseTimeMs: undefined });
    await handleFeedback(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData).toHaveProperty("feedbackId");
  });

  it("returns 400 when responseTimeMs is negative", async () => {
    const ctx = createCtx({ ...VALID_BODY, responseTimeMs: -1 });
    await handleFeedback(ctx as never);
    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_REQUEST" }),
      400,
    );
  });
});

describe("handleFeedback — accepted feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns feedbackId and validationStatus on valid submission", async () => {
    const ctx = createCtx(VALID_BODY);
    await handleFeedback(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData.feedbackId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(responseData.validationStatus).toBe("accepted");
  });

  it("accepts all valid accuracyRating values", async () => {
    const ratings = ["about_right", "too_high", "too_low", "way_off"] as const;
    for (const rating of ratings) {
      vi.clearAllMocks();
      const ctx = createCtx({ ...VALID_BODY, accuracyRating: rating });
      await handleFeedback(ctx as never);
      const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(responseData).toHaveProperty("feedbackId");
    }
  });

  it("stores feedback to supabase via waitUntil (non-blocking)", async () => {
    const ctx = createCtx(VALID_BODY);
    await handleFeedback(ctx as never);
    expect(ctx.executionCtx.waitUntil).toHaveBeenCalled();
  });
});

describe("handleFeedback — flagged feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns validationStatus=flagged for too-fast response (< 3s)", async () => {
    const ctx = createCtx({ ...VALID_BODY, responseTimeMs: 1000 });
    await handleFeedback(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData.validationStatus).toBe("flagged");
    expect(responseData.validationFlags).toContain("too_fast");
  });

  it("returns flagged for contradictory rating (too_low but corrected is lower)", async () => {
    const ctx = createCtx({
      ...VALID_BODY,
      accuracyRating: "too_low",
      llmFillPercentage: 60,
      correctedFillPercentage: 50, // contradicts: says too_low but corrected < llm
    });
    await handleFeedback(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData.validationStatus).toBe("flagged");
    expect(responseData.validationFlags).toContain("contradictory");
  });

  it("returns flagged for extreme delta (> 30% difference)", async () => {
    const ctx = createCtx({
      ...VALID_BODY,
      correctedFillPercentage: 20, // 50% delta from mocked 70% in DB
    });
    await handleFeedback(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData.validationStatus).toBe("flagged");
    expect(responseData.validationFlags).toContain("extreme_delta");
  });

  it("accepted feedback has no validationFlags in response", async () => {
    const ctx = createCtx(VALID_BODY);
    await handleFeedback(ctx as never);
    const [responseData] = (ctx.json as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(responseData.validationFlags).toBeUndefined();
  });
});
