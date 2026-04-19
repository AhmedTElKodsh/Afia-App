# Training Data Pipeline Documentation

## Overview

The training data pipeline augments real-world scan images to accelerate dataset growth for local model training. This document covers the augmentation script usage, configuration, and operational guidelines.

## Training Data Augmentation Script

### Purpose

The augmentation script (`scripts/augment-training-data.js`) generates 10 synthetic variants of each training-eligible scan image using image transformations. This multiplies the training dataset size by ~10x, helping reach the 500+ sample threshold needed for model training.

### Prerequisites

**Required Software:**
- Node.js 18+ (for ES modules and fetch API)
- npm packages: `sharp`, `@supabase/supabase-js` (already in package.json)

**Required Environment Variables:**

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key  # Admin access required

# Backblaze B2 Storage Configuration
B2_KEY_ID=your-b2-key-id
B2_APPLICATION_KEY=your-b2-application-key
B2_BUCKET_NAME=your-bucket-name
B2_DOWNLOAD_URL=https://f000.backblazeb2.com/file/your-bucket
```

**Setting Environment Variables:**

Create a `.env` file in the project root (or use `.env.local`):

```bash
# Copy from .env.example
cp .env.example .env

# Add the required variables
echo "SUPABASE_URL=https://..." >> .env
echo "SUPABASE_SERVICE_KEY=..." >> .env
# ... etc
```

### Usage

**Basic Usage:**

```bash
# Run augmentation on all training-eligible samples
node scripts/augment-training-data.js
```

**Dry Run (Preview Mode):**

```bash
# See what would be created without making changes
node scripts/augment-training-data.js --dry-run
```

**Limited Processing:**

```bash
# Process only first 10 base images (useful for testing)
node scripts/augment-training-data.js --limit=10
```

**Combined Options:**

```bash
# Dry run with limit
node scripts/augment-training-data.js --dry-run --limit=5
```

### Augmentation Variants

The script generates 10 variants per base image:

| Variant | Transformation | Purpose |
|---------|---------------|---------|
| `brightness_plus` | Brightness +20% | Simulate brighter lighting conditions |
| `brightness_minus` | Brightness -20% | Simulate darker lighting conditions |
| `contrast_plus` | Contrast +15% | Enhance edge definition |
| `contrast_minus` | Contrast -15% | Soften edge definition |
| `flip_horizontal` | Horizontal flip | Mirror image for orientation invariance |
| `rotate_plus` | Rotation +5° | Slight clockwise tilt |
| `rotate_minus` | Rotation -5° | Slight counter-clockwise tilt |
| `jpeg_quality_low` | JPEG quality 0.6 | High compression variation |
| `jpeg_quality_mid` | JPEG quality 0.7 | Medium compression variation |
| `jpeg_quality_high` | JPEG quality 0.85 | Low compression variation |

### Output

**Console Output Example:**

```
🚀 Training Data Augmentation Pipeline
=====================================

📥 Step 1: Querying base training samples...
   Found 45 training-eligible base samples

📊 Training Dataset Status:
   Base samples (non-augmented): 45
   Threshold for training: 500
   ⏳ Need 455 more base samples to reach threshold.

🔄 Processing 1/45: a1b2c3d4-...
   SKU: filippo-berio-500ml, Fill: 42%
   📥 Downloading: images/scan-a1b2c3d4.jpg
   ✅ Created: 8, Skipped: 0

🔄 Processing 2/45: e5f6g7h8-...
   SKU: filippo-berio-500ml, Fill: 67%
   📥 Downloading: images/scan-e5f6g7h8.jpg
   ✅ Created: 8, Skipped: 0

...

✅ Augmentation Pipeline Complete!
===================================
Base samples processed: 45
Variants created: 360
Variants skipped (duplicates): 0
Total new training samples: 360
```

**Database Records:**

Each augmented variant creates a new row in `training_samples`:

```sql
SELECT * FROM training_samples WHERE source_type = 'augmented' LIMIT 1;
```

```json
{
  "id": "uuid-...",
  "source_type": "augmented",
  "source_id": "base-sample-uuid",
  "image_url": "https://f000.backblazeb2.com/.../aug-{id}-brightness_plus.jpg",
  "sku": "filippo-berio-500ml",
  "label_percentage": 42.0,
  "weight": 1.0,
  "metadata": {
    "augmentation_type": "brightness_plus",
    "augmentation_params": {
      "name": "brightness_plus",
      "brightness": 1.2,
      "description": "Brightness +20%"
    },
    "base_sample_id": "base-sample-uuid",
    "description": "Brightness +20%"
  },
  "created_at": "2026-04-16T..."
}
```

### Idempotency

The script is **idempotent** — running it multiple times will not create duplicate variants. Before creating each variant, it checks if a record already exists with the same:
- `source_id` (base sample ID)
- `augmentation_type` (variant name)

If found, the variant is skipped.

### Error Handling

**Individual Image Failures:**
- If a single image fails to download or process, the script logs the error and continues with the next image
- Partial failures do not stop the entire pipeline

**Network Failures:**
- B2 download/upload failures are logged
- Supabase query/insert failures are logged
- Script exits with error code 1 on fatal errors

**Recovery:**
- Re-run the script after fixing issues
- Idempotency ensures no duplicate work

### Performance Considerations

**Processing Speed:**
- ~2-5 seconds per base image (10 variants)
- 100 base images = ~5-10 minutes total

**Memory Usage:**
- Images are processed one at a time
- Peak memory: ~50-100MB per image
- No batch loading to avoid memory issues

**Storage Costs:**
- Each base image generates ~10x storage
- 100 base images (5MB each) → 500MB base + 5GB augmented = 5.5GB total
- Monitor B2 storage usage in dashboard

### Monitoring & Validation

**Check Training Dataset Size:**

```sql
-- Count base samples
SELECT COUNT(*) FROM training_samples WHERE source_type = 'scan';

-- Count augmented samples
SELECT COUNT(*) FROM training_samples WHERE source_type = 'augmented';

-- Count by SKU
SELECT sku, source_type, COUNT(*) 
FROM training_samples 
GROUP BY sku, source_type 
ORDER BY sku, source_type;
```

**Verify Augmentation Coverage:**

```sql
-- Find base samples without augmented variants
SELECT s.id, s.sku, s.label_percentage
FROM training_samples s
WHERE s.source_type = 'scan'
AND NOT EXISTS (
  SELECT 1 FROM training_samples a
  WHERE a.source_type = 'augmented'
  AND a.source_id = s.id
);
```

**Check for Duplicate Variants:**

```sql
-- Should return 0 rows if idempotency is working
SELECT source_id, metadata->>'augmentation_type', COUNT(*)
FROM training_samples
WHERE source_type = 'augmented'
GROUP BY source_id, metadata->>'augmentation_type'
HAVING COUNT(*) > 1;
```

### Training Activation Threshold

**Goal:** 500+ base (non-augmented) training-eligible scans

**Current Status Check:**

```sql
SELECT COUNT(*) as base_samples
FROM training_samples
WHERE source_type = 'scan';
```

**When threshold is reached:**
1. Script will display: `✅ Threshold reached! Ready for model training.`
2. Proceed to Story 7.3: TF.js CNN Regressor Training & Deployment
3. Use augmented data to train the local model

### Troubleshooting

**Problem:** "Missing required environment variables"
- **Solution:** Ensure all required env vars are set in `.env` file

**Problem:** "Failed to download image: 404"
- **Solution:** Check B2_DOWNLOAD_URL is correct and image exists in bucket

**Problem:** "Failed to get B2 upload URL: 401"
- **Solution:** Verify B2_KEY_ID and B2_APPLICATION_KEY are correct

**Problem:** "Failed to create Supabase record: permission denied"
- **Solution:** Ensure SUPABASE_SERVICE_KEY (not anon key) is being used

**Problem:** Script runs but creates 0 variants
- **Solution:** Check that base samples exist with `source_type = 'scan'` in Supabase

### Integration with CI/CD

**Manual Trigger (Recommended for POC):**

```bash
# Run locally when new training data is available
npm run augment-training-data
```

**Scheduled Job (Future Enhancement):**

```yaml
# .github/workflows/augment-training-data.yml
name: Augment Training Data
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  augment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: node scripts/augment-training-data.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          B2_KEY_ID: ${{ secrets.B2_KEY_ID }}
          B2_APPLICATION_KEY: ${{ secrets.B2_APPLICATION_KEY }}
          B2_BUCKET_NAME: ${{ secrets.B2_BUCKET_NAME }}
          B2_DOWNLOAD_URL: ${{ secrets.B2_DOWNLOAD_URL }}
```

## Next Steps

After augmentation pipeline is operational:

1. **Monitor dataset growth** — Track base sample count toward 500 threshold
2. **Validate augmented images** — Spot-check a few augmented variants in B2 bucket
3. **Proceed to Story 7.3** — Train TF.js CNN regressor when threshold is reached
4. **Iterate on augmentation** — Adjust parameters if model performance is poor

## References

- [Story 7.2: Training Data Augmentation Pipeline](../_bmad-output/implementation-artifacts/7-2-training-data-augmentation-pipeline.md)
- [Architecture: Training Data Pipeline](./architecture.md#15-training-data-pipeline)
- [Supabase Schema](./supabase-schema-migration.sql)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
