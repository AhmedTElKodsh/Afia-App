import type { Context } from "hono";
import type { Env } from "./types.ts";
import { validateFeedback } from "./validation/feedbackValidator.ts";
import { updateScanWithFeedback } from "./storage/r2Client.ts";

export async function handleFeedback(c: Context<{ Bindings: Env }>): Promise<Response> {
  const body = await c.req.json<{
    scanId?: unknown;
    accuracyRating?: unknown;
    correctedFillPercentage?: unknown;
    responseTimeMs?: unknown;
    llmFillPercentage?: unknown;
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

  if (typeof body.llmFillPercentage !== "number") {
    return c.json({ error: "Missing required field: llmFillPercentage", code: "INVALID_REQUEST" }, 400);
  }

  const correctedFillPercentage =
    typeof body.correctedFillPercentage === "number"
      ? body.correctedFillPercentage
      : undefined;

  // Validate the feedback
  const validation = validateFeedback(body.llmFillPercentage, {
    accuracyRating: body.accuracyRating as "about_right" | "too_high" | "too_low" | "way_off",
    responseTimeMs: body.responseTimeMs,
    correctedFillPercentage,
  });

  const feedbackId = crypto.randomUUID();

  // Update R2 metadata with feedback (non-blocking)
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
    }).catch((err) => console.error("R2 feedback update failed:", err))
  );

  return c.json({
    feedbackId,
    validationStatus: validation.validationStatus,
    ...(validation.validationFlags.length > 0 && {
      validationFlags: validation.validationFlags,
    }),
  });
}
