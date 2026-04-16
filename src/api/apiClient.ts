import type { AnalysisResult } from "../state/appState.ts";

const WORKER_URL = import.meta.env.VITE_PROXY_URL || "http://localhost:8787";
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
  const response = await fetchWithTimeout(`${WORKER_URL}/analyze`, {
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

export async function logLocalScan(
  sku: string,
  imageBase64: string,
  localModelPrediction: { percentage: number; confidence: string },
  latencyMs: number
): Promise<{ scanId: string }> {
  const response = await fetchWithTimeout(`${WORKER_URL}/log-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, imageBase64, localModelPrediction, latencyMs }),
  });

  if (!response.ok) {
    throw new Error(`Failed to log local scan (${response.status})`);
  }

  return response.json();
}

export async function submitFeedback(
  scanId: string,
  accuracyRating: "about_right" | "too_high" | "too_low" | "way_off",
  llmFillPercentage: number,
  correctedFillPercentage?: number,
  responseTimeMs?: number
): Promise<{ feedbackId: string; validationStatus: string }> {
  const response = await fetchWithTimeout(`${WORKER_URL}/feedback`, {
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

/**
 * Admin: Authenticate and get session token
 */
export async function adminLogin(password: string): Promise<{ token: string; expiresAt: number }> {
  const response = await fetchWithTimeout(`${WORKER_URL}/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("UNAUTHORIZED");
    throw new Error("Failed to authenticate");
  }

  return response.json();
}

/**
 * Admin: Fetch scans from Supabase (via Worker proxy)
 */
export async function getAdminScans(token: string): Promise<any[]> {
  const response = await fetchWithTimeout(`${WORKER_URL}/admin/scans`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Failed to fetch scans");
  return response.json();
}

/**
 * Admin: Submit manual correction
 */
export async function submitAdminCorrection(
  token: string,
  correction: {
    scanId: string;
    actualFillPercentage: number;
    errorCategory: string;
    isTrainingEligible: boolean;
  }
): Promise<void> {
  const response = await fetchWithTimeout(`${WORKER_URL}/admin/correct`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(correction),
  });
  if (!response.ok) throw new Error("Failed to save correction");
}

/**
 * Admin: Export training-eligible scans from Supabase
 */
export async function getAdminExport(token: string): Promise<any[]> {
  const response = await fetchWithTimeout(`${WORKER_URL}/admin/export`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!response.ok) throw new Error("Failed to export dataset");
  return response.json();
}

/**
 * Admin: Upload image for training
 */
export async function adminUploadImage(
  token: string,
  file: File,
  sku: string,
  fillPercentage: number,
  augmentationType: string = "none"
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sku", sku);
  formData.append("fillPercentage", fillPercentage.toString());
  formData.append("augmentationType", augmentationType);

  const response = await fetchWithTimeout(`${WORKER_URL}/admin/upload`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) throw new Error("Upload failed");
}

export function reportScanError(
  sku: string,
  error: string,
  deviceInfo?: string
): void {
  const payload = JSON.stringify({
    sku,
    error,
    timestamp: new Date().toISOString(),
    deviceInfo,
  });

  // Use sendBeacon for fully non-blocking telemetry that survives page unloads
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(`${WORKER_URL}/error`, blob);
    return;
  }

  // Fallback to fetch (fire and forget)
  fetch(`${WORKER_URL}/error`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true, // Help it survive if fetch is used
  }).catch(() => {
    // Silently fail as this is background telemetry
  });
}

