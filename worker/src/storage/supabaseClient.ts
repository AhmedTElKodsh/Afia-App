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

function getSupabase(env: Env): SupabaseClient {
  if (!supabaseInstance) {
    // Priority: SERVICE_ROLE_KEY for admin bypass, fallback to ANON
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
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

  // 3. Insert metadata into 'scans' table (Revised Directive B Schema)
  const { error: dbError } = await supabase.from("scans").insert([
    {
      id: scanId,
      sku: metadata.sku,
      image_url: imagePath,
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
    reasoning: row.llm_fallback_prediction?.reasoning
  }));
}
