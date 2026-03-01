import type { Env } from "../types.ts";
import type { BottleGeometry } from "../bottleRegistry.ts";

export interface ScanMetadata {
  scanId: string;
  timestamp: string;
  sku: string;
  bottleGeometry: BottleGeometry;
  oilType: string;
  aiProvider: "gemini" | "groq";
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  latencyMs: number;
  imageQualityIssues?: string[];
  imageStoragePath: string;
  feedback?: {
    feedbackId: string;
    feedbackTimestamp: string;
    accuracyRating: "about_right" | "too_high" | "too_low" | "way_off";
    correctedFillPercentage?: number;
    validationStatus: "accepted" | "flagged";
    validationFlags?: string[];
    confidenceWeight: number;
    trainingEligible: boolean;
  };
}

export async function storeScan(
  env: Env,
  scanId: string,
  imageBase64: string,
  metadata: Omit<ScanMetadata, "imageStoragePath">
): Promise<void> {
  if (!env.TRAINING_BUCKET) {
    console.info("R2 not configured — skipping scan storage for", scanId);
    return;
  }
  const imagePath = `images/${scanId}.jpg`;

  // Decode base64 to binary and store as JPEG
  const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
  await env.TRAINING_BUCKET.put(imagePath, imageBytes, {
    httpMetadata: { contentType: "image/jpeg" },
  });

  // Store metadata JSON
  const fullMetadata: ScanMetadata = { ...metadata, imageStoragePath: imagePath };
  await env.TRAINING_BUCKET.put(
    `metadata/${scanId}.json`,
    JSON.stringify(fullMetadata),
    { httpMetadata: { contentType: "application/json" } }
  );
}

export async function updateScanWithFeedback(
  env: Env,
  scanId: string,
  feedback: NonNullable<ScanMetadata["feedback"]>
): Promise<void> {
  if (!env.TRAINING_BUCKET) {
    console.info("R2 not configured — skipping feedback storage for", scanId);
    return;
  }
  const metadataObj = await env.TRAINING_BUCKET.get(`metadata/${scanId}.json`);
  if (!metadataObj) {
    throw new Error(`Scan metadata not found for scanId: ${scanId}`);
  }

  const existing = await metadataObj.json() as ScanMetadata;
  const updated: ScanMetadata = { ...existing, feedback };

  await env.TRAINING_BUCKET.put(
    `metadata/${scanId}.json`,
    JSON.stringify(updated),
    { httpMetadata: { contentType: "application/json" } }
  );
}
