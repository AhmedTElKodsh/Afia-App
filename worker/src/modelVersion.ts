/**
 * Model Version Management
 * Story 7.5 - Task 1
 * 
 * Provides endpoint for PWA to check current active model version
 * and trigger automatic updates when new versions are deployed.
 */

import type { Context } from "hono";
import type { Env, Variables } from "./types";
import { getSupabaseClient } from "./db/supabase";

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
  const mockHeader = (c.req.header("x-mock-mode") || c.req.header("X-Mock-Mode") || "").toLowerCase();
  const isMockMode = mockHeader === "true" || mockHeader === "1" || mockHeader === "yes";
  const enableMockLLM = (c.env.ENABLE_MOCK_LLM ?? "").toLowerCase() === "true";
  const shouldSkipSupabase = isMockMode || enableMockLLM;
  const stage = (c.env.STAGE ?? "").trim().toLowerCase();
  const isExplicitNonProdStage =
    stage === "local" || stage === "dev" || stage === "test" || stage === "stage2" || stage === "stage3" || stage === "preview";

  const fallbackResponse: ModelVersionResponse = {
    version: "1.0.0",
    mae: 0.08,
    trainingCount: 0,
    r2Key: "models/fill-regressor/v1.0.0/model.json",
    deployedAt: new Date(0).toISOString(),
  };

  // Mock mode / local-dev: do not attempt Supabase at all.
  // This prevents noisy logs when running without real Supabase connectivity.
  if (shouldSkipSupabase) {
    return c.json(fallbackResponse, 200, {
      "Cache-Control": "public, max-age=60",
      "X-RequestId": requestId,
    });
  }

  try {
    // Query Supabase for active model version
    const supabase = getSupabaseClient(c.env);

    const { data, error } = await supabase
      .from("model_versions")
      .select("version, mae, training_samples_count, r2_key, deployed_at")
      .eq("is_active", true)
      .single();

    if (error) {
      // In local dev / E2E mock mode, Supabase may be intentionally unset or using placeholder
      // credentials. Return a deterministic fallback instead of spamming noisy 500 logs.
      console.error(`[${requestId}] Supabase query error:`, error);
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
    const message = err instanceof Error ? err.message : String(err);
    const isMissingSupabaseConfig =
      message.includes("SUPABASE_URL not configured") ||
      message.includes("Supabase key not configured");

    if (isMissingSupabaseConfig) {
      // Never silently succeed in production-like stages: missing Supabase is a deployment failure.
      // Allow deterministic fallback only in explicit non-prod stages.
      if (isExplicitNonProdStage) {
        console.warn(
          `[${requestId}] handleModelVersion using fallback response in non-prod stage (${message})`
        );
        return c.json(fallbackResponse, 200, {
          "Cache-Control": "public, max-age=60",
          "X-RequestId": requestId,
        });
      }

      console.error(`[${requestId}] Supabase not configured (${message})`);
      return c.json(
        {
          error: "Supabase not configured",
          code: "SUPABASE_NOT_CONFIGURED",
          requestId,
        },
        500
      );
    }

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
