/**
 * Admin Correction Handler
 * Story 7.7 - Admin Correction Feedback Loop
 * 
 * Handles admin corrections for scan results:
 * - "Correct" marks training-eligible with no correction
 * - Manual corrections save to R2 metadata and Supabase
 * - Upserts training_samples with high-confidence ground truth
 */

import type { Context } from "hono";
import type { Env, Variables } from "./types.ts";
import { verifyAdminSession } from "./admin.ts";
import { getMetadata, putMetadata } from "./storage/r2Client.ts";
import { upsertTrainingSample } from "./storage/supabaseClient.ts";

export interface AdminCorrectRequest {
  scanId: string;
  accuracy: "correct" | "too_big" | "too_small" | "way_off";
  correctedFillPct?: number;
  method?: "manual";
}

export interface AdminCorrectResponse {
  success: boolean;
  scanId: string;
  trainingEligible: boolean;
}

export async function handleAdminCorrect(
  c: Context<{ Bindings: Env; Variables: Variables }>
): Promise<Response> {
  // AC: Admin auth required
  if (!await verifyAdminSession(c)) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }

  const requestId = c.get("requestId");

  try {
    const body = await c.req.json<AdminCorrectRequest>();
    const { scanId, accuracy, correctedFillPct, method = "manual" } = body;

    // Validation
    if (!scanId || !accuracy) {
      return c.json(
        { error: "Missing required fields", code: "VALIDATION_ERROR", requestId },
        400
      );
    }

    if (accuracy !== "correct" && correctedFillPct === undefined) {
      return c.json(
        { error: "correctedFillPct required when accuracy !== 'correct'", code: "VALIDATION_ERROR", requestId },
        400
      );
    }

    if (correctedFillPct !== undefined && (correctedFillPct < 1 || correctedFillPct > 99)) {
      return c.json(
        { error: "correctedFillPct must be between 1 and 99", code: "VALIDATION_ERROR", requestId },
        400
      );
    }

    // Load existing metadata from R2
    const metadata = await getMetadata(c.env, scanId);
    if (!metadata) {
      return c.json(
        { error: "Scan not found", code: "NOT_FOUND", requestId },
        404
      );
    }

    // AC2: "Correct" marks training-eligible with no correction entry
    if (accuracy === "correct") {
      metadata.trainingEligible = true;
      await putMetadata(c.env, scanId, metadata);

      // Upsert Supabase training_samples with original fill percentage
      const confirmedPct = metadata.inference?.llmFillPercentage ?? metadata.fillPercentage;
      if (confirmedPct === undefined || confirmedPct === null) {
        return c.json({ error: "Cannot verify scan fill percentage — scan data incomplete", code: "DATA_INCOMPLETE", requestId }, 422);
      }
      await upsertTrainingSample(c.env, {
        scanId,
        imageUrl: `scans/${scanId}.jpg`,
        sku: metadata.sku,
        confirmedFillPct: confirmedPct,
        labelSource: "admin_verified",
        labelConfidence: 1.0,
        augmented: false,
        split: "train",
      });

      return c.json({
        success: true,
        scanId,
        trainingEligible: true,
      });
    }

    // AC4: Manual correction saves to R2 + Supabase
    metadata.adminCorrection = {
      correctedFillPct: correctedFillPct!,
      by: "admin",
      method,
      at: new Date().toISOString(),
    };
    metadata.trainingEligible = true;

    await putMetadata(c.env, scanId, metadata);

    // AC7: Upsert Supabase training_samples (no duplicates)
    await upsertTrainingSample(c.env, {
      scanId,
      imageUrl: `scans/${scanId}.jpg`,
      sku: metadata.sku,
      confirmedFillPct: correctedFillPct!,
      labelSource: "admin_correction",
      labelConfidence: 1.0,
      augmented: false,
      split: "train",
    });

    console.log(`[${requestId}] Admin correction saved for scan ${scanId}: ${correctedFillPct}%`);

    return c.json({
      success: true,
      scanId,
      trainingEligible: true,
    });
  } catch (error) {
    console.error(`[${requestId}] Admin correct error:`, error);
    return c.json(
      {
        error: "Failed to save correction",
        code: "INTERNAL_ERROR",
        requestId,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
