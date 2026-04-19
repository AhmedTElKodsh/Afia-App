/**
 * Model Version Management
 * Story 7.5 - Task 1
 * 
 * Provides endpoint for PWA to check current active model version
 * and trigger automatic updates when new versions are deployed.
 */

import type { Context } from "hono";
import type { Env, Variables } from "./types";
import { createClient } from "@supabase/supabase-js";

export interface ModelVersionResponse {
  version: string;           // e.g., "1.2.0"
  mae: number;              // e.g., 0.087
  trainingCount: number;    // e.g., 1250
  r2Key: string;            // e.g., "models/fill-regressor/v1.2.0/model.json"
  deployedAt: string;       // ISO 8601 timestamp
}

/**
 * GET /model/version
 * 
 * Returns the currently active model version metadata.
 * Cached for 5 minutes to reduce database load.
 */
export async function handleModelVersion(
  c: Context<{ Bindings: Env; Variables: Variables }>
): Promise<Response> {
  const requestId = c.get("requestId");

  try {
    // Query Supabase for active model version
    const supabase = createClient(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("model_versions")
      .select("version, mae, training_samples_count, r2_key, deployed_at")
      .eq("is_active", true)
      .single();

    if (error) {
      console.error(`[${requestId}] Supabase query error:`, error);
      
      // Return graceful error response
      return c.json(
        {
          error: "Failed to fetch model version",
          code: "DATABASE_ERROR",
          requestId,
        },
        500
      );
    }

    if (!data) {
      console.warn(`[${requestId}] No active model version found`);
      
      return c.json(
        {
          error: "No active model version",
          code: "NO_ACTIVE_VERSION",
          requestId,
        },
        404
      );
    }

    // Build response
    const response: ModelVersionResponse = {
      version: data.version,
      mae: data.mae,
      trainingCount: data.training_samples_count,
      r2Key: data.r2_key,
      deployedAt: data.deployed_at,
    };

    // Return with 5-minute cache headers
    return c.json(response, 200, {
      "Cache-Control": "public, max-age=300", // 5 minutes
      "X-RequestId": requestId,
    });
  } catch (err) {
    console.error(`[${requestId}] Unexpected error in handleModelVersion:`, err);
    
    return c.json(
      {
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        requestId,
      },
      500
    );
  }
}
