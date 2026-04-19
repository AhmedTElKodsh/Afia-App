export interface Env {
  // Supabase for training data storage
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string; // Optional service role key for admin tasks
  // KV namespace for rate limiting
  RATE_LIMIT_KV: KVNamespace;
  // Secrets (set via wrangler secret put)
  GEMINI_API_KEY: string;
  GEMINI_API_KEY2?: string;
  GEMINI_API_KEY3?: string;
  GEMINI_API_KEY4?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  ADMIN_PASSWORD?: string; // Admin dashboard password (server-side only)
  // Monitoring
  BETTERSTACK_TOKEN?: string; // Optional monitoring token
  SLACK_WEBHOOK_URL?: string; // Optional Slack notifications
  // Vars
  ALLOWED_ORIGINS: string;
  DEBUG_REASONING?: string; // Set to "true" to include reasoning field in LLM output
}

export interface Variables {
  requestId: string;
}

export interface LLMResponse {
  brand: "Afia" | "unknown";
  fillPercentage: number;
  confidence: "high" | "medium" | "low";
  imageQualityIssues?: string[];
  reasoning?: string;
  // UI mapping fields
  red_line_y_normalized?: number; // 0 (bottom) to 1000 (fill line)
  bottle_top_y_px?: number;
  bottle_bottom_y_px?: number;
  below_55ml_threshold?: boolean;
  guidanceNeeded?: string | null;
}
