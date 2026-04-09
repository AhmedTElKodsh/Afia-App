export type AppState =
  | "IDLE"
  | "CAMERA_ACTIVE"
  | "PHOTO_CAPTURED"
  | "API_PENDING"
  | "API_SUCCESS"
  | "API_LOW_CONFIDENCE"
  | "API_ERROR"
  | "QR_MISMATCH"
  | "UNKNOWN_BOTTLE";

export interface AnalysisResult {
  scanId: string;
  fillPercentage: number;
  remainingMl: number;
  confidence: "high" | "medium" | "low";
  aiProvider: "gemini" | "groq";
  latencyMs: number;
  cacheHit?: boolean;
  tokensEstimated?: number;
  imageQualityIssues?: string[];
}

export interface BottleContext {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
}
