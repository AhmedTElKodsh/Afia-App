import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../types";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initializes and returns a singleton Supabase client for the Cloudflare Worker.
 * Uses service_role key if available for administrative bypass of RLS,
 * otherwise uses anon key.
 */
export function getSupabaseClient(env: Env): SupabaseClient {
  if (!supabaseInstance) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
    if (!key) throw new Error("Supabase key not configured");

    supabaseInstance = createClient(env.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

// Database Types (matches migrations)
export interface ScanRecord {
  id: string;
  sku: string;
  image_url: string;
  local_model_result: number | null;
  local_model_confidence: number | null;
  local_model_version: string | null;
  local_model_inference_ms: number | null;
  llm_fallback_used: boolean;
  local_model_prediction: unknown;
  llm_fallback_prediction: unknown;
  client_metadata: unknown;
  created_at: string;
  training_eligible?: boolean;
  admin_correction?: unknown;
  admin_llm_result?: unknown;
}
