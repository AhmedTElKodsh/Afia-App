export interface AnalysisResult {
  analysis: {
    estimated_volume_ml: number;
    confidence_score: number;
    meniscus_detected: boolean;
  };
  ui_mapping: {
    red_line_y_normalized: number;
    bottle_top_y_px: number;
    bottle_bottom_y_px: number;
  };
  logic_flags: {
    below_55ml_threshold: boolean;
    lighting_quality: 'good' | 'poor';
    guidance_needed: string | null;
  };
}

export interface AnalysisLog {
  id?: string;
  created_at?: string;
  image_url: string;
  primary_provider: string;
  local_result_ml?: number;
  llm_result_ml?: number;
  llm_raw_response?: any;
  status: 'success' | 'failed' | 'mismatch' | 'flagged';
  error_message?: string;
}
