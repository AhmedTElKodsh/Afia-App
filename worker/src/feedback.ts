import type { Context } from "hono";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "./types.ts";
import { validateFeedback } from "./validation/feedbackValidator.ts";
import { updateScanWithFeedback } from "./storage/supabaseClient.ts";

export async function handleFeedback(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json<{
    scanId?: unknown;
    accuracyRating?: unknown;
    correctedFillPercentage?: unknown;
    responseTimeMs?: unknown;
  }>();

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

  if (typeof body.responseTimeMs !== "number" || body.responseTimeMs < 0) {
    return c.json({ error: "Missing or invalid responseTimeMs", code: "INVALID_REQUEST" }, 400);
  }

  // --- Security: Retrieve original LLM fill percentage from DB ---
  // Don't trust the client-provided llmFillPercentage to prevent poisoning validation logic.
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);
  const { data: scanRecord, error: fetchError } = await supabase
    .from("scans")
    .select("fill_percentage")
    .eq("id", body.scanId)
    .single();

  if (fetchError || !scanRecord) {
    console.error(`[${body.scanId}] Feedback scan not found:`, fetchError);
    return c.json({ error: "Scan record not found", code: "NOT_FOUND" }, 404);
  }

  const llmFillPercentage = scanRecord.fill_percentage;
  const correctedFillPercentage =
    typeof body.correctedFillPercentage === "number"
      ? body.correctedFillPercentage
      : undefined;

  // Validate the feedback
  const validation = validateFeedback(llmFillPercentage, {
    accuracyRating: body.accuracyRating as "about_right" | "too_high" | "too_low" | "way_off",
    responseTimeMs: body.responseTimeMs,
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
