/**
 * Inference Router
 * Story 7.6 - LLM Fallback Routing Logic
 * 
 * Routes fill-level inference to local TF.js model or LLM Worker based on:
 * - Model availability and confidence
 * - Platform capabilities (iOS WebGL)
 * - Brand classifier confidence and SKU availability
 */

export type InferenceRoute = "local" | "llm" | "needs-sku";

export interface RouterInput {
  modelLoaded: boolean;
  localModelConfidence: number | null;
  isIOS: boolean;
  webGLAvailable: boolean;
  brandClassifierConfidence: number | null;
  sku: string | null;
}

/**
 * Determine which inference path to use based on model state and platform
 * 
 * AC1: High-confidence local route (confidence >= 0.75)
 * AC2: Low-confidence fallthrough (confidence < 0.75)
 * AC3: Model not loaded fallthrough
 * AC4: iOS WebGL unavailable fallthrough
 * AC6: No-QR + low-confidence edge case
 */
export function routeInference(input: RouterInput): InferenceRoute {
  // AC6: Edge case - no SKU context and brand classifier not confident enough
  if ((input.brandClassifierConfidence ?? 0) < 0.80 && input.sku === null) {
    return "needs-sku";
  }

  // AC4: iOS with no WebGL → always LLM (WASM prohibited on iOS)
  if (input.isIOS && !input.webGLAvailable) {
    return "llm";
  }

  // AC3: Model not loaded → LLM
  if (!input.modelLoaded || input.localModelConfidence === null) {
    return "llm";
  }

  // AC1: High-confidence → local; AC2: low-confidence → LLM fallback
  return input.localModelConfidence >= 0.75 ? "local" : "llm";
}
