import { createClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  key: string;
}

/**
 * Initializes the Supabase client for the Cloudflare Worker.
 * Uses service_role key if available for administrative bypass of RLS,
 * otherwise uses anon key.
 */
export function getSupabaseClient(config: SupabaseConfig) {
  return createClient(config.url, config.key, {
    auth: {
      persistSession: false,
    },
  });
}

// Database Types (matches migrations)
export interface ScanRecord {
  sku: string;
  image_url: string;
  local_model_prediction: any;
  llm_fallback_prediction: any;
  client_metadata: any;
}
