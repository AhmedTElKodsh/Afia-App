export type AppState =
  | "IDLE"
  | "CAMERA_ACTIVE"
  | "PHOTO_CAPTURED"
  | "API_PENDING"
  | "FILL_CONFIRM"
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
  aiProvider: "gemini" | "groq" | "openrouter" | "mistral" | "local-cnn" | "mock-api";
  latencyMs: number;
  imageQualityIssues?: string[];
  isUnsupportedSku?: boolean;
  red_line_y_normalized?: number;
}

export interface BottleContext {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
}
