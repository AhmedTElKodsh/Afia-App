# Training Data Upload - Quick Start Guide

## What Was Done

✅ **Created merge script** (`scripts/merge-augmented-images.py`)
- Merges images from `oil-bottle-augmented/augmented-output` into parent folders

✅ **Enhanced upload script** (`scripts/load-frames-to-supabase.py`)
- Now processes **both** `oil-bottle-frames` and `oil-bottle-augmented` by default
- Added support for multiple image formats: `.jpg`, `.jpeg`, `.png`, `.bmp`, `.gif`, `.webp`
- Changed default behavior to process both folders automatically

✅ **Created documentation** (`scripts/README-training-data.md`)
- Complete guide for both scripts

## Quick Execution Steps

### Step 1: Merge Augmented Images (One-time)

```bash
# Preview what will happen
python scripts/merge-augmented-images.py --dry-run

# Execute the merge
python scripts/merge-augmented-images.py
```

This merges 280 images per level from `augmented-output` into parent folders.

### Step 2: Upload Everything to Supabase

```bash
# Preview (recommended first time)
python scripts/load-frames-to-supabase.py --dry-run

# Upload both folders (frames + augmented)
python scripts/load-frames-to-supabase.py
```

## What Happens

### Merge Script
- Moves images from `oil-bottle-augmented/augmented-output/{level}/` → `oil-bottle-augmented/{level}/`
- Example: 550ml folder grows from 84 → 364 images
- Safe: Skips files that already exist

### Upload Script
- **Processes both folders automatically** (new behavior!)
- Uploads to Supabase Storage bucket `training-images`:
  - Base frames → `scan/{level}/{filename}`
  - Augmented → `augmented/{level}/{filename}`
- Inserts metadata into `training_samples` table
- Calculates fill percentage: `550ml` → 36.67% (550/1500 × 100)
- Assigns train/val/test split (80/10/10) deterministically
- Batch processing with progress bar
- **Idempotent**: Safe to run multiple times

## Expected Results

### Before Upload
```
training_samples table: 0 rows
```

### After Upload (estimated)
```
Base scans (oil-bottle-frames):     ~2,500 images
Augmented (oil-bottle-augmented):   ~8,000 images
Total training_samples:             ~10,500 rows
```

### Training Threshold
- **Minimum required**: 500 base scans
- **Your data**: Well above threshold ✓
- Ready to run `train-fill-regressor.py`

## Command Reference

### Upload Options
```bash
# Both folders (default)
python scripts/load-frames-to-supabase.py

# Only base frames
python scripts/load-frames-to-supabase.py --frames-only

# Only augmented
python scripts/load-frames-to-supabase.py --augmented-only

# Test with limited images
python scripts/load-frames-to-supabase.py --limit=100

# Dry run (no changes)
python scripts/load-frames-to-supabase.py --dry-run
```

## Verification

After upload, check Supabase:

1. **Storage**: Dashboard → Storage → training-images
   - Should see `scan/` and `augmented/` folders

2. **Database**: Dashboard → Table Editor → training_samples
   - Check row count
   - Verify `source_type` distribution
   - Check `metadata.split` distribution (should be ~80/10/10)

## Next Steps

Once upload completes:
```bash
python scripts/train-fill-regressor.py
```

This will train the ML model using your uploaded training data.
