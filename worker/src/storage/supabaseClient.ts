import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types";

export interface ScanMetadata {
  scanId: string;
  timestamp: string;
  sku: string;
  bottleGeometry: { shape: string; calibrationPoints?: unknown[] };
  oilType: string;
  totalVolumeMl: number;
  aiProvider: string;
  fillPercentage: number;
  confidence: string;
  latencyMs: number;
  imageQualityIssues?: string[];
  isContribution?: boolean;
  localModelPrediction?: { percentage: number; confidence: string };
  reasoning?: string;
  // Story 7.4: Local model metadata
  localModelResult?: {
    fillPercentage: number;
    confidence: number;
    modelVersion: string;
    inferenceTimeMs: number;
  };
  // Story 7.6 - AC5: Separate confidence field for simplified storage
  localModelConfidence?: number | null;
  llmFallbackUsed?: boolean;
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
  errorCategory?: "none" | "too_big" | "too_small" | "occlusion" | "lighting";
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(env: Env): SupabaseClient {
  if (!supabaseInstance) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
    if (!key) throw new Error("Supabase API key not configured (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY required)");
    supabaseInstance = createClient(env.SUPABASE_URL, key, {
      auth: { persistSession: false }
    });
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

  // 1. Convert base64 to binary
  let binaryData: Uint8Array;
  try {
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
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
  const imagePath = `raw/${metadata.sku}/${new Date().toISOString().split('T')[0]}/${scanId}.jpg`;
  const { error: storageError } = await supabase.storage
    .from("scans")
    .upload(imagePath, binaryData, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (storageError) {
    console.error("Supabase Storage Error:", storageError);
    throw storageError;
  }

  // 3. Insert metadata into 'scans' table (Story 7.4: Updated schema)
  const { error: dbError } = await supabase.from("scans").insert([
    {
      id: scanId,
      sku: metadata.sku,
      image_url: imagePath,
      // Story 7.4: New local model fields
      local_model_result: metadata.localModelResult?.fillPercentage ?? null,
      local_model_confidence: metadata.localModelResult?.confidence ?? null,
      local_model_version: metadata.localModelResult?.modelVersion ?? null,
      local_model_inference_ms: metadata.localModelResult?.inferenceTimeMs ?? null,
      llm_fallback_used: metadata.llmFallbackUsed ?? false,
      // Legacy field for backward compatibility
      local_model_prediction: metadata.localModelPrediction || {},
      llm_fallback_prediction: {
        percentage: metadata.fillPercentage,
        confidence: metadata.confidence,
        provider: metadata.aiProvider,
        reasoning: metadata.reasoning
      },
      client_metadata: {
        latency_ms: metadata.latencyMs,
        image_quality_issues: metadata.imageQualityIssues,
        is_contribution: metadata.isContribution ?? false,
        timestamp: metadata.timestamp
      }
    },
  ]);

  if (dbError) {
    console.error("Supabase Database Error:", dbError);
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

  // Update correction table (Directive B Schema)
  const { error: dbError } = await supabase
    .from("admin_corrections")
    .upsert({
      scan_id: scanId,
      actual_fill_percentage: feedback.correctedFillPercentage,
      error_category: feedback.errorCategory || 'none',
      is_training_eligible: feedback.trainingEligible,
      reviewed_at: feedback.feedbackTimestamp
    });

  if (dbError) {
    console.error("Supabase Feedback Update Error:", dbError);
    throw dbError;
  }
}

/**
 * Fetches recent scans for the admin dashboard
 */
export async function getGlobalScans(
  env: Env,
  limit = 50,
  offset = 0
): Promise<ScanMetadata[]> {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Supabase Fetch Scans Error:", error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    scanId: row.id,
    timestamp: row.created_at,
    sku: row.sku,
    bottleGeometry: { shape: "unknown" }, // Full geometry not in DB
    oilType: "unknown",
    totalVolumeMl: 0, // Not stored in scans table, would need join
    aiProvider: row.llm_fallback_prediction?.provider || "unknown",
    fillPercentage: row.llm_fallback_prediction?.percentage || 0,
    confidence: row.llm_fallback_prediction?.confidence || "unknown",
    latencyMs: row.client_metadata?.latency_ms || 0,
    imageQualityIssues: row.client_metadata?.image_quality_issues,
    isContribution: row.client_metadata?.is_contribution,
    localModelPrediction: row.local_model_prediction,
    reasoning: row.llm_fallback_prediction?.reasoning,
    // Story 7.4: New local model fields
    localModelResult: row.local_model_result !== null && row.local_model_confidence !== null ? {
      fillPercentage: row.local_model_result,
      confidence: row.local_model_confidence,
      modelVersion: row.local_model_version ?? "unknown",
      inferenceTimeMs: row.local_model_inference_ms ?? 0,
    } : undefined,
    llmFallbackUsed: row.llm_fallback_used
  }));
}

/**
 * Story 7.7: Upsert training sample with admin correction
 */
export interface TrainingSampleData {
  scanId: string;
  imageUrl: string;
  sku: string;
  confirmedFillPct: number;
  labelSource: "admin_correction" | "admin_verified" | "user_feedback";
  labelConfidence: number;
  augmented: boolean;
  split: "train" | "val" | "test";
}

export async function upsertTrainingSample(
  env: Env,
  data: TrainingSampleData
): Promise<void> {
  if (data.confirmedFillPct < 0 || data.confirmedFillPct > 100) {
    throw new Error("confirmedFillPct must be between 0 and 100");
  }
  if (!Number.isFinite(data.labelConfidence) || data.labelConfidence < 0 || data.labelConfidence > 1) {
    throw new Error("labelConfidence must be a finite number between 0 and 1");
  }
  const supabase = getSupabase(env);

  const { error } = await supabase
    .from("training_samples")
    .upsert(
      {
        scan_id: data.scanId,
        image_url: data.imageUrl,
        sku: data.sku,
        confirmed_fill_pct: data.confirmedFillPct,
        label_source: data.labelSource,
        label_confidence: data.labelConfidence,
        augmented: data.augmented,
        split: data.split,
      },
      { onConflict: "scan_id" }
    );

  if (error) {
    console.error("Supabase Training Sample Upsert Error:", error);
    throw error;
  }
}
