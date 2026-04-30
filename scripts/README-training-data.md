# Training Data Upload Scripts

Scripts for preparing and uploading training images to Supabase.

## Overview

1. **merge-augmented-images.py** - Merge augmented images from subdirectory into parent folders
2. **load-frames-to-supabase.py** - Upload images to Supabase Storage and insert metadata into training_samples table

## Prerequisites

```bash
pip install -r scripts/requirements.txt
```

Ensure `.env` file contains:
```
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 1: Merge Augmented Images

Merge images from `oil-bottle-augmented/augmented-output` into parent folders:

```bash
# Dry run (preview what will happen)
python scripts/merge-augmented-images.py --dry-run

# Actually merge the files
python scripts/merge-augmented-images.py
```

**What it does:**
- Moves all images from `oil-bottle-augmented/augmented-output/{level}/` to `oil-bottle-augmented/{level}/`
- Skips files that already exist (no overwrites)
- Supports all common image formats (.jpg, .jpeg, .png, .bmp, .gif, .webp)

## Step 2: Upload to Supabase

Upload images to Supabase Storage and populate the training_samples table:

```bash
# Dry run (preview without uploading)
python scripts/load-frames-to-supabase.py --dry-run

# Upload both folders (default behavior)
python scripts/load-frames-to-supabase.py

# Upload only base frames
python scripts/load-frames-to-supabase.py --frames-only

# Upload only augmented images
python scripts/load-frames-to-supabase.py --augmented-only

# Limit number of images (for testing)
python scripts/load-frames-to-supabase.py --limit=100
```

**What it does:**
- Parses folder names (e.g., `550ml` → 36.67% fill level)
- Assigns train/val/test split (80/10/10) deterministically by filename hash
- Uploads images to `training-images` bucket at path `{source_type}/{level}/{filename}`
  - Base frames: `scan/550ml/image.jpg`
  - Augmented: `augmented/550ml/image.jpg`
- Inserts metadata into `training_samples` table:
  - `source_type`: 'scan' or 'augmented'
  - `sku`: 'afia-corn-1.5l'
  - `label_percentage`: calculated fill percentage
  - `metadata.split`: 'train', 'val', or 'test'
- **Idempotent**: Skips images already in database
- Batch inserts (50 at a time) with progress bar
- Shows threshold status (500+ base scans needed for training)

## Supported Image Formats

- `.jpg` / `.jpeg`
- `.png`
- `.bmp`
- `.gif`
- `.webp`

## Folder Structure

### Before Merge:
```
oil-bottle-augmented/
├── 550ml/              (84 images)
├── 660ml/
└── augmented-output/
    ├── 550ml/          (280 images)
    └── 660ml/
```

### After Merge:
```
oil-bottle-augmented/
├── 550ml/              (364 images - merged)
├── 660ml/
└── augmented-output/   (can be deleted)
```

## Database Schema

The `training_samples` table structure:

```sql
CREATE TABLE training_samples (
    id UUID PRIMARY KEY,
    source_type TEXT CHECK (source_type IN ('scan', 'augmented')),
    source_id UUID,
    image_url TEXT NOT NULL,
    sku TEXT NOT NULL,
    label_percentage NUMERIC(5,2) NOT NULL,
    weight NUMERIC(3,2) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Training Threshold

The training pipeline requires **500+ base scans** (source_type='scan') to begin training. The upload script will show your current progress toward this threshold.

## Troubleshooting

### Bucket doesn't exist
Run `python scripts/setup_supabase_storage.py` first to create the bucket.

### Bucket is private
The script will warn you. Make it public via Supabase Dashboard:
Storage → training-images → Edit bucket → Public ON

### Images already exist
The script is idempotent - it will skip images whose URLs already exist in the database.

### Name conflicts during merge
If a file with the same name exists in the target folder, the merge script will skip it and show a warning.
