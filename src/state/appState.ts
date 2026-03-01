export type AppState =
  | "IDLE"
  | "CAMERA_ACTIVE"
  | "PHOTO_CAPTURED"
  | "API_PENDING"
  | "API_SUCCESS"
  | "API_LOW_CONFIDENCE"
  | "API_ERROR"
  | "UNKNOWN_BOTTLE";

export interface AnalysisResult {
  scanId: string;
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  aiProvider: "gemini" | "groq";
  latencyMs: number;
  imageQualityIssues?: string[];
}

export interface BottleContext {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
}
