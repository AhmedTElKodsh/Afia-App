/**
 * Model Version Management Admin Endpoints
 * Story 10-2 - Task 2
 * 
 * Provides admin endpoints for activating and deactivating model versions.
 * Ensures only one version can be active at a time.
 */

import type { Env } from "../types";
import { getSupabaseClient } from "../db/supabase";

/**
 * GET /admin/model/versions
 * 
 * Returns all model versions from Supabase, sorted by deployed_at (newest first).
 * Requires admin authentication.
 */
export async function handleGetVersions(env: Env): Promise<Response> {
  try {
    const supabase = getSupabaseClient(env);

    const { data, error } = await supabase
      .from("model_versions")
      .select("*")
      .order("deployed_at", { ascending: false });

    if (error) {
      console.error("[handleGetVersions] Supabase error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ versions: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[handleGetVersions] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * POST /admin/model/activate
 * 
 * Activates a specific model version and deactivates all others.
 * Ensures only one version is active at a time.
 * 
 * Request body: { version: string }
 */
export async function handleActivateVersion(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; }
    catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

    const { version } = body;
    if (typeof version !== "string" || !version) {
      return new Response(JSON.stringify({ error: "version must be a non-empty string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(env);

    // Atomically set is_active: each row gets true only if it matches version, false otherwise.
    // Uses a computed column expression to avoid the two-step non-atomic pattern.
    const { error } = await supabase.rpc("set_active_model_version", { target_version: version });

    if (error) {
      // Fallback: two-step with error check on each step (better than silently skipping)
      const { error: deactivateError } = await supabase
        .from("model_versions")
        .update({ is_active: false })
        .neq("version", "");

      if (deactivateError) {
        console.error("[handleActivateVersion] Deactivate error:", deactivateError);
        return new Response(JSON.stringify({ error: deactivateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { error: activateError } = await supabase
        .from("model_versions")
        .update({ is_active: true })
        .eq("version", version);

      if (activateError) {
        console.error("[handleActivateVersion] Activate error:", activateError);
        return new Response(JSON.stringify({ error: activateError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[handleActivateVersion] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * POST /admin/model/deactivate
 * 
 * Deactivates a specific model version.
 * Warning: If this is the only active version, users will fall back to LLM.
 * 
 * Request body: { version: string }
 */
export async function handleDeactivateVersion(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; }
    catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

    const { version } = body;
    if (typeof version !== "string" || !version) {
      return new Response(JSON.stringify({ error: "version must be a non-empty string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(env);

    const { error } = await supabase
      .from("model_versions")
      .update({ is_active: false })
      .eq("version", version);

    if (error) {
      console.error("[handleDeactivateVersion] Supabase error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[handleDeactivateVersion] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
