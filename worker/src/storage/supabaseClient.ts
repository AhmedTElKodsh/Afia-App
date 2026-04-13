import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types";

export interface ScanMetadata {
  scanId: string;
  timestamp: string;
  sku: string;
  bottleGeometry: { shape: string; calibrationPoints?: unknown[] };
  oilType: string;
  aiProvider: string;
  fillPercentage: number;
  confidence: string;
  latencyMs: number;
  imageQualityIssues?: string[];
}

export interface FeedbackData {
  feedbackId: string;
  feedbackTimestamp: string;
  accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
  correctedFillPercentage?: number;
  validationStatus: string;
  validationFlags?: string[];
  confidenceWeight: number;
  trainingEligible: boolean;
}

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(env: Env): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

/**
 * Uploads scan image to Supabase Storage and initial metadata to Database
 */
export async function storeScan(
  env: Env,
  scanId: string,
  imageBase64: string,
  metadata: ScanMetadata
): Promise<void> {
  const supabase = getSupabase(env);

  // 1. Safe base64 to binary conversion with JPEG magic byte check
  let binaryData: Uint8Array;
  try {
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    
    // Quick check for JPEG magic bytes (/9j/)
    if (!base64Data.startsWith("/9j/")) {
      throw new Error("Invalid JPEG magic bytes");
    }

    const binaryString = atob(base64Data);
    binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }
  } catch (e) {
    console.error(`[${scanId}] Base64 decode failed:`, e);
    throw new Error("Invalid image encoding");
  }

  // 2. Upload Image to 'scans' bucket
  const { error: storageError } = await supabase.storage
    .from("scans")
    .upload(`${scanId}.jpg`, binaryData, {
      contentType: "image/jpeg",
      upsert: true, // Use upsert: true to prevent orphaned retries from failing
    });

  if (storageError) {
    console.error("Supabase Storage Error:", storageError);
    throw storageError;
  }

  // 3. Insert metadata into 'scans' table
  const { error: dbError } = await supabase.from("scans").insert([
    {
      id: scanId,
      sku: metadata.sku,
      timestamp: metadata.timestamp,
      oil_type: metadata.oilType,
      // Store a summary or flattened geometry to avoid DB row bloat
      bottle_geometry: { 
        shape: metadata.bottleGeometry.shape,
        pointCount: metadata.bottleGeometry.calibrationPoints?.length ?? 0
      },
      ai_provider: metadata.aiProvider,
      fill_percentage: metadata.fillPercentage,
      confidence: metadata.confidence,
      latency_ms: metadata.latencyMs,
      quality_issues: metadata.imageQualityIssues,
      image_path: `${scanId}.jpg`,
    },
  ]);

  if (dbError) {
    console.error("Supabase Database Error:", dbError);
    // Note: We don't delete the storage object here to avoid complexity in waitUntil,
    // but the record will be incomplete.
    throw dbError;
  }
}

/**
 * Updates scan metadata with user feedback in Supabase Database
 */
export async function updateScanWithFeedback(
  env: Env,
  scanId: string,
  feedback: FeedbackData
): Promise<void> {
  const supabase = getSupabase(env);

  const { error: dbError } = await supabase
    .from("scans")
    .update({
      feedback_id: feedback.feedbackId,
      feedback_timestamp: feedback.feedbackTimestamp,
      accuracy_rating: feedback.accuracyRating,
      corrected_fill_percentage: feedback.correctedFillPercentage,
      validation_status: feedback.validationStatus,
      validation_flags: feedback.validationFlags,
      confidence_weight: feedback.confidenceWeight,
      training_eligible: feedback.trainingEligible,
    })
    .eq("id", scanId);

  if (dbError) {
    console.error("Supabase Feedback Update Error:", dbError);
    throw dbError;
  }
}
