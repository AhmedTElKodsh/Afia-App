import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { validateFeedback } from "./validation/feedbackValidator.ts";
import { getSupabase, updateScanWithFeedback } from "./storage/supabaseClient.ts";

export async function handleFeedback(c: Context<{ Bindings: Env; Variables: Variables }>): Promise<Response> {
  let body: { scanId?: unknown; accuracyRating?: unknown; correctedFillPercentage?: unknown; responseTimeMs?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body", code: "INVALID_REQUEST" }, 400);
  }

  // Validate required fields
  if (typeof body.scanId !== "string" || !body.scanId) {
    return c.json({ error: "Missing required field: scanId", code: "INVALID_REQUEST" }, 400);
  }

  const validRatings = ["about_right", "too_high", "too_low", "way_off"];
  if (
    typeof body.accuracyRating !== "string" ||
    !validRatings.includes(body.accuracyRating)
  ) {
    return c.json({ error: "Invalid accuracyRating", code: "INVALID_REQUEST" }, 400);
  }

  if (typeof body.responseTimeMs === "number" && body.responseTimeMs < 0) {
    return c.json({ error: "responseTimeMs cannot be negative", code: "INVALID_REQUEST" }, 400);
  }

  // --- Security: Retrieve original LLM fill percentage from DB ---
  // Don't trust the client-provided llmFillPercentage to prevent poisoning validation logic.
  let supabase: ReturnType<typeof getSupabase>;
  try { supabase = getSupabase(c.env); }
  catch { return c.json({ error: 'Database not configured', code: 'SERVICE_UNAVAILABLE' }, 503); }
  const { data: scanRecord, error: fetchError } = await supabase
    .from("scans")
    .select("llm_fallback_prediction")
    .eq("id", body.scanId)
    .maybeSingle();

  if (fetchError || !scanRecord) {
    console.error(`[${body.scanId}] Feedback scan not found:`, fetchError);
    return c.json({ error: "Scan record not found", code: "NOT_FOUND" }, 404);
  }

  const llmFillPercentage = scanRecord.llm_fallback_prediction?.percentage;
  if (typeof llmFillPercentage !== 'number') {
     return c.json({ error: "Incomplete scan record", code: "DATA_INCOMPLETE" }, 500);
  }
  const correctedFillPercentage =
    typeof body.correctedFillPercentage === "number"
      ? body.correctedFillPercentage
      : undefined;

  // Validate the feedback
  const validation = validateFeedback(llmFillPercentage, {
    accuracyRating: body.accuracyRating as "about_right" | "too_high" | "too_low" | "way_off",
    responseTimeMs: typeof body.responseTimeMs === "number" && body.responseTimeMs >= 0 ? body.responseTimeMs : undefined,
    correctedFillPercentage,
  });

  const feedbackId = crypto.randomUUID();

  // Update Supabase metadata with feedback (non-blocking)
  c.executionCtx.waitUntil(
    updateScanWithFeedback(c.env, body.scanId, {
      feedbackId,
      feedbackTimestamp: new Date().toISOString(),
      accuracyRating: body.accuracyRating as "about_right" | "too_high" | "too_low" | "way_off",
      correctedFillPercentage,
      validationStatus: validation.validationStatus,
      validationFlags: validation.validationFlags.length > 0 ? validation.validationFlags : undefined,
      confidenceWeight: validation.confidenceWeight,
      trainingEligible: validation.trainingEligible,
    }).catch((err) => console.error("Supabase feedback update failed:", err))
  );

  return c.json({
    feedbackId,
    validationStatus: validation.validationStatus,
    ...(validation.validationFlags.length > 0 && {
      validationFlags: validation.validationFlags,
    }),
  });
}
