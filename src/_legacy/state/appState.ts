export type AppState =
  | "IDLE"
  | "CAMERA_ACTIVE"
  | "API_PENDING"
  | "FILL_CONFIRM"
  | "API_SUCCESS"
  | "API_LOW_CONFIDENCE"
  | "API_ERROR";

export interface AnalysisResult {
  scanId: string;
  fillPercentage: number;
  remainingMl: number;
  confidence: "high" | "medium" | "low";
  aiProvider: "gemini" | "groq" | "openrouter" | "mistral" | "local-cnn" | "local-tfjs" | "mock-api" | "queued";
  latencyMs: number;
  imageQualityIssues?: string[];
  isUnsupportedSku?: boolean;
  red_line_y_normalized?: number;
  // Local model metadata (Story 7.4)
  localModelResult?: {
    fillPercentage: number;
    confidence: number;
    modelVersion: string;
    inferenceTimeMs: number;
  };
  llmFallbackUsed?: boolean;
  offlineMode?: boolean; // Story 7.4 - Task 6: Indicates analysis was done offline with low confidence
  queuedForSync?: boolean; // Story 7.8 - AC3: Indicates scan was queued for background sync
}

export interface BottleContext {
  sku: string;
  name: string;
  oilType: string;
  totalVolumeMl: number;
}
