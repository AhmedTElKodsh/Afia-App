/**
 * R2/Supabase Storage Client
 * Story 7.7 - Admin Correction Feedback Loop
 * 
 * Provides unified interface for metadata and image storage
 * Currently uses Supabase Storage/Database (R2 migration planned)
 */

import type { Env } from "../types.ts";
import { getSupabaseClient } from "../db/supabase";

function getSupabase(env: Env) {
  return getSupabaseClient(env);
}

export interface ScanMetadataExtended {
  scanId: string;
  sku: string;
  fillPercentage: number;
  confidence: string;
  aiProvider: string;
  timestamp: string;
  trainingEligible?: boolean;
  adminCorrection?: {
    correctedFillPct: number;
    by: string;
    method: "manual" | "llm-rerun";
    at: string;
  };
  adminLlmResult?: {
    fillPercentage: number;
    confidence: "high" | "medium" | "low";
    provider: string;
    rerunAt: string;
  };
  inference?: {
    llmFillPercentage?: number;
    localModelResult?: number;
    localModelConfidence?: number;
  };
}

/**
 * Get scan metadata from Supabase
 */
export async function getMetadata(
  env: Env,
  scanId: string
): Promise<ScanMetadataExtended | null> {
  const supabase = getSupabase(env);

  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .single();

  if (error || !data) {
    console.error(`Failed to fetch metadata for ${scanId}:`, error);
    return null;
  }

  // Map Supabase schema to metadata format
  return {
    scanId: data.id,
    sku: data.sku,
    fillPercentage: data.llm_fallback_prediction?.percentage || 0,
    confidence: data.llm_fallback_prediction?.confidence || "unknown",
    aiProvider: data.llm_fallback_prediction?.provider || "unknown",
    timestamp: data.created_at,
    trainingEligible: data.training_eligible || false,
    adminCorrection: data.admin_correction || undefined,
    adminLlmResult: data.admin_llm_result || undefined,
    inference: {
      llmFillPercentage: data.llm_fallback_prediction?.percentage,
      localModelResult: data.local_model_result,
      localModelConfidence: data.local_model_confidence,
    },
  };
}

/**
 * Update scan metadata in Supabase
 */
export async function putMetadata(
  env: Env,
  scanId: string,
  metadata: Partial<ScanMetadataExtended>
): Promise<void> {
  const supabase = getSupabase(env);

  const updateData: any = {};

  if (metadata.trainingEligible !== undefined) {
    updateData.training_eligible = metadata.trainingEligible;
  }

  if (metadata.adminCorrection) {
    updateData.admin_correction = metadata.adminCorrection;
  }

  if (metadata.adminLlmResult) {
    updateData.admin_llm_result = metadata.adminLlmResult;
  }

  const { error } = await supabase
    .from("scans")
    .update(updateData)
    .eq("id", scanId);

  if (error) {
    console.error(`Failed to update metadata for ${scanId}:`, error);
    throw error;
  }
}

/**
 * Get scan image from Supabase Storage
 */
export async function getImage(
  env: Env,
  scanId: string
): Promise<ArrayBuffer | null> {
  const supabase = getSupabase(env);

  // First get the image path from metadata
  const { data: scanData, error: scanError } = await supabase
    .from("scans")
    .select("image_url")
    .eq("id", scanId)
    .single();

  if (scanError || !scanData?.image_url) {
    console.error(`Failed to fetch image path for ${scanId}:`, scanError);
    return null;
  }

  // Download image from Supabase Storage
  const { data, error } = await supabase.storage
    .from("scans")
    .download(scanData.image_url);

  if (error || !data) {
    console.error(`Failed to download image for ${scanId}:`, error);
    return null;
  }

  return await data.arrayBuffer();
}
