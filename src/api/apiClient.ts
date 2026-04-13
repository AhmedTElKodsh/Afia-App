import type { AnalysisResult } from "../state/appState.ts";

const PROXY_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:8787";
const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function analyzeBottle(
  sku: string,
  imageBase64: string
): Promise<AnalysisResult> {
  const response = await fetchWithTimeout(`${PROXY_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, imageBase64 }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || `Analysis failed (${response.status})`
    );
  }

  return response.json() as Promise<AnalysisResult>;
}

export async function submitFeedback(
  scanId: string,
  accuracyRating: "about_right" | "too_high" | "too_low" | "way_off",
  llmFillPercentage: number,
  correctedFillPercentage?: number,
  responseTimeMs?: number
): Promise<{ feedbackId: string; validationStatus: string }> {
  const response = await fetchWithTimeout(`${PROXY_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scanId,
      accuracyRating,
      llmFillPercentage,
      correctedFillPercentage,
      responseTimeMs,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error || `Feedback submission failed (${response.status})`
    );
  }

  return response.json() as Promise<{
    feedbackId: string;
    validationStatus: string;
  }>;
}

export async function reportScanError(
  sku: string,
  error: string,
  deviceInfo?: string
): Promise<void> {
  // Fire and forget error logging to Worker
  fetch(`${PROXY_URL}/error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sku,
      error,
      timestamp: new Date().toISOString(),
      deviceInfo,
    }),
  }).catch(() => {
    // Silently fail as this is background telemetry
  });
}
