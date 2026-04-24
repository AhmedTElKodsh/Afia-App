-- 2026-04-14 - Training Pipeline Migration

-- 1. Bottles Registry
CREATE TABLE IF NOT EXISTS public.bottles (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    oil_type TEXT NOT NULL,
    shape TEXT CHECK (shape IN ('cylinder', 'frustum')),
    total_volume_ml INTEGER NOT NULL,
    geometry JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Scans Table
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT REFERENCES public.bottles(sku) ON DELETE SET NULL,
    image_url TEXT NOT NULL, -- Path to R2 bucket
    local_model_prediction JSONB DEFAULT '{}', -- {percentage, confidence}
    llm_fallback_prediction JSONB DEFAULT '{}', -- {percentage, confidence, provider}
    client_metadata JSONB DEFAULT '{}', -- {timestamp, device_info, latency_ms}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Admin Corrections & Labels (Ground Truth)
CREATE TABLE IF NOT EXISTS public.admin_corrections (
    scan_id UUID PRIMARY KEY REFERENCES public.scans(id) ON DELETE CASCADE,
    actual_fill_percentage NUMERIC(5,2) CHECK (actual_fill_percentage >= 0 AND actual_fill_percentage <= 100),
    actual_volume_ml NUMERIC(10,2),
    error_category TEXT CHECK (error_category IN ('too_big', 'too_small', 'none', 'occlusion', 'lighting')),
    is_training_eligible BOOLEAN DEFAULT false,
    admin_notes TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID -- If we add multiple admins later
);

-- 4. Augmented Data (Synthetic images for training)
CREATE TABLE IF NOT EXISTS public.augmented_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    augmentation_type TEXT, -- 'brightness', 'tilt', 'crop', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Training Samples (Consolidated view for ML pipeline)
CREATE TABLE IF NOT EXISTS public.training_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT CHECK (source_type IN ('scan', 'augmented')),
    source_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    sku TEXT NOT NULL,
    label_percentage NUMERIC(5,2) NOT NULL,
    weight NUMERIC(3,2) DEFAULT 1.0, -- Higher weight for admin verified
    metadata JSONB DEFAULT '{}', -- {provider, lighting_quality, etc.}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Model Versions
CREATE TABLE IF NOT EXISTS public.model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL UNIQUE,
    architecture TEXT DEFAULT 'MobileNetV3-Small',
    mae DOUBLE PRECISION NOT NULL,
    val_accuracy DOUBLE PRECISION,
    training_samples_count INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(), -- Added back for compatibility
    deployed_by TEXT,
    notes TEXT
);

-- Ensure created_at exists on all tables for existing environments (idempotent backfill)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['bottles', 'scans', 'augmented_data', 'training_samples', 'model_versions']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'created_at') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()', tbl);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Only one version can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_version ON public.model_versions (is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.augmented_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

-- Anonymous users (PWA) can only insert scans
CREATE POLICY "Anon users can insert scans" ON public.scans
    FOR INSERT WITH CHECK (true);

-- Admins (Authenticated) have full access
CREATE POLICY "Admins full access" ON public.bottles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access" ON public.scans FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access" ON public.admin_corrections FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access" ON public.augmented_data FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access" ON public.training_samples FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins full access" ON public.model_versions FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scans_sku ON public.scans(sku);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at);
CREATE INDEX IF NOT EXISTS idx_corrections_eligible ON public.admin_corrections(is_training_eligible);
CREATE INDEX IF NOT EXISTS idx_training_sku ON public.training_samples(sku);
CREATE INDEX IF NOT EXISTS idx_training_created ON public.training_samples(created_at);
