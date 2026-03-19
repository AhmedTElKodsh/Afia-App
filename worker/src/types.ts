export interface Env {
  // Supabase for training data storage
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  // KV namespace for rate limiting
  RATE_LIMIT_KV: KVNamespace;
  // Secrets (set via wrangler secret put)
  GEMINI_API_KEY: string;
  GEMINI_API_KEY2?: string; // Optional second key for rotation
  GEMINI_API_KEY3?: string; // Optional third key for rotation
  GROQ_API_KEY: string;
  // Monitoring
  BETTERSTACK_TOKEN?: string; // Optional monitoring token
  SLACK_WEBHOOK_URL?: string; // Optional Slack notifications
  // Vars
  ALLOWED_ORIGINS: string;
}

export interface LLMResponse {
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  imageQualityIssues?: string[];
  reasoning?: string;
}
