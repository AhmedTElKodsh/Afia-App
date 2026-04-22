import { supabase } from '../config/supabase';
import type { AnalysisResult } from '../types/analysis';

/**
 * System Prompt for Stage 1 Analysis
 * Uses 55ml increments and coordinate mapping.
 */
const SYSTEM_PROMPT = `
**V1.5L AFIA ANALYSIS PROTOCOL**

1. **Calibration**: Use 'Reference_Strip' to calibrate the scale. 
   - 0 (Bottom) = Empty
   - 1000 (Full-Mark) = 1500ml

2. **Meniscus Detection**:
   - Locate the oil line. 
   - If the detected line is below the 55ml mark shown in the reference, set 'estimated_volume_ml' to 0 and 'below_55ml_threshold' to true.
   - Otherwise, calculate volume in 55ml increments.

3. **Coordinate Mapping**:
   - Identify the Y-coordinate of the meniscus.
   - Return 'red_line_y_normalized' as an integer between 0 and 1000, where 0 is the very bottom of the bottle base and 1000 is the 1500ml fill line.

4. **Environmental Check**:
   - If glare blocks the oil line, return 'guidance_needed': "Move away from window or direct light source."
   - If the image is too grainy, return 'guidance_needed': "Turn on more lights for a clearer shot."

**Output Format (STRICT JSON ONLY)**:
{
  "analysis": {
    "estimated_volume_ml": 0,
    "confidence_score": 0.0,
    "meniscus_detected": boolean
  },
  "ui_mapping": {
    "red_line_y_normalized": 0,
    "bottle_top_y_px": 0,
    "bottle_bottom_y_px": 0
  },
  "logic_flags": {
    "below_55ml_threshold": boolean,
    "lighting_quality": "good" | "poor",
    "guidance_needed": string | null
  }
}
`;

/**
 * Bulletproof Analysis Handler
 * Retries across multiple Gemini keys, then falls back to Grok.
 */
export async function analyzeBottleImage(
  userImageBase64: string, 
  tiltAngle: number | null = null
): Promise<AnalysisResult> {
  const providers = [
    { id: 'gemini_1', type: 'gemini' },
    { id: 'gemini_2', type: 'gemini' },
    { id: 'grok_fallback', type: 'grok' }
  ];

  let lastError: any = null;

  for (const provider of providers) {
    try {
      console.log(`Attempting analysis with ${provider.id}...`);
      
      // 1. Call the LLM API
      const response = await callLLMProvider(provider, userImageBase64, tiltAngle);
      
      // 2. Log result to Supabase (Background)
      logAnalysisToSupabase(provider.id, response);

      return response;
    } catch (err) {
      console.error(`Provider ${provider.id} failed:`, err);
      lastError = err;
      // Log failure to Supabase
      logAnalysisFailure(provider.id, err);
      continue;
    }
  }

  throw new Error(`All analysis providers failed. Last error: ${lastError?.message}`);
}

async function callLLMProvider(
  provider: any, 
  image: string, 
  tiltAngle: number | null
): Promise<AnalysisResult> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ 
      providerId: provider.id, 
      image,
      tiltAngle,
      prompt: SYSTEM_PROMPT 
    })
  });
  
  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  return response.json();
}

async function logAnalysisToSupabase(provider: string, result: AnalysisResult) {
  try {
    const { error } = await supabase
      .from('analysis_logs')
      .insert({
        image_url: 'pending_upload', // Actual URL after storage upload
        primary_provider: provider,
        llm_result_ml: result.analysis.estimated_volume_ml,
        llm_raw_response: result,
        status: 'success'
      });
    if (error) {
      console.error('[Telemetry] Supabase log insert failed:', error);
      // Non-fatal — analysis already succeeded; telemetry loss is acceptable
    }
  } catch (err) {
    console.error('[Telemetry] logAnalysisToSupabase threw unexpectedly:', err);
    // Swallowed intentionally: logging failure must never surface to the user
  }
}

async function logAnalysisFailure(provider: string, error: any) {
  await supabase
    .from('analysis_logs')
    .insert({
      primary_provider: provider,
      status: 'failed',
      error_message: error.message
    });
}
