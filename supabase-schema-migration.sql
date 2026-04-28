-- Migration: Update scans table schema to match worker code
-- This migrates from the old flat schema to the new JSONB-based schema

-- Step 1: Add new columns
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS local_model_result FLOAT,
  ADD COLUMN IF NOT EXISTS local_model_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS local_model_version TEXT,
  ADD COLUMN IF NOT EXISTS local_model_inference_ms INTEGER,
  ADD COLUMN IF NOT EXISTS llm_fallback_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_model_prediction JSONB,
  ADD COLUMN IF NOT EXISTS llm_fallback_prediction JSONB,
  ADD COLUMN IF NOT EXISTS client_metadata JSONB;

-- Step 2: Migrate existing data from old columns to new JSONB columns
UPDATE scans
SET
  created_at = COALESCE(created_at, timestamp),
  image_url = COALESCE(image_url, image_path),
  llm_fallback_prediction = jsonb_build_object(
    'percentage', fill_percentage,
    'confidence', confidence,
    'provider', ai_provider,
    'reasoning', NULL
  ),
  client_metadata = jsonb_build_object(
    'latency_ms', latency_ms,
    'image_quality_issues', CASE
      WHEN quality_issues IS NOT NULL AND quality_issues != ''
      THEN string_to_array(quality_issues, ',')
      ELSE '[]'::text[]
    END,
    'is_contribution', false,
    'timestamp', timestamp
  )
WHERE llm_fallback_prediction IS NULL OR client_metadata IS NULL;

-- Step 3: Drop old columns (OPTIONAL - comment out if you want to keep them for backup)
-- ALTER TABLE scans
--   DROP COLUMN IF EXISTS timestamp,
--   DROP COLUMN IF EXISTS oil_type,
--   DROP COLUMN IF EXISTS bottle_geometry,
--   DROP COLUMN IF EXISTS ai_provider,
--   DROP COLUMN IF EXISTS fill_percentage,
--   DROP COLUMN IF EXISTS confidence,
--   DROP COLUMN IF EXISTS latency_ms,
--   DROP COLUMN IF EXISTS quality_issues,
--   DROP COLUMN IF EXISTS image_path,
--   DROP COLUMN IF EXISTS feedback_id;

-- Step 4: Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Step 5: Verify the migration
SELECT
  id,
  sku,
  created_at,
  llm_fallback_prediction->>'percentage' as fill_percentage,
  llm_fallback_prediction->>'confidence' as confidence,
  client_metadata->>'latency_ms' as latency_ms
FROM scans
LIMIT 5;
