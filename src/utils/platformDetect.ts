/**
 * Platform Detection Utilities
 * Story 7.6 - LLM Fallback Routing Logic
 * 
 * Detects iOS platform and WebGL availability for inference routing decisions
 */

/**
 * Detect if running on iOS (iPhone or iPad)
 */
export const isIOS = /iPhone|iPad/i.test(navigator.userAgent);

/**
 * Check if WebGL is available in the current browser
 * 
 * WebGL is required for TensorFlow.js GPU acceleration.
 * On iOS Safari, WebGL may be unavailable in certain contexts
 * (e.g., in-app browsers, low power mode).
 */
export async function isWebGLAvailable(): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
    return !!gl;
  } catch {
    return false;
  }
}
