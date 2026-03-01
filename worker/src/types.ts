export interface Env {
  // R2 bucket for training data storage (optional — disabled when R2 not provisioned)
  TRAINING_BUCKET?: R2Bucket;
  // KV namespace for rate limiting
  RATE_LIMIT_KV: KVNamespace;
  // Secrets (set via wrangler secret put)
  GEMINI_API_KEY: string;
  GEMINI_API_KEY2?: string; // Optional second key for rotation
  GEMINI_API_KEY3?: string; // Optional third key for rotation
  GROQ_API_KEY: string;
  // Vars
  ALLOWED_ORIGINS: string;
}

export interface LLMResponse {
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  imageQualityIssues?: string[];
  reasoning?: string;
}
