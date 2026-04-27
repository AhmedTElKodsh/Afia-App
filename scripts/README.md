# Training Scripts

This directory contains Python scripts for training the fill-level regressor model and managing training data.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run training
python train-fill-regressor.py
```

## Training Scripts

- `train-fill-regressor.py` - Main training script
- `train-fill-regressor-local.py` - Local training variant
- `test_training_pipeline.py` - Training pipeline tests
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variable template
- `utils/` - Utility modules
  - `data_loader.py` - Supabase data loading and image preprocessing
  - `model_builder.py` - Model architecture and compilation
  - `evaluation.py` - Model evaluation and metrics

## Data Management Scripts

### Image Augmentation & Organization
- `augment-existing-data.js` - Generate 10 transformation variants per frame (Story 7.2)
- `augment-training-data.js` - Augment training data with transformations
- `generate-ai-images.js` - Generate AI-augmented training images
- `analyze-augmented-data.js` - Analyze augmented data structure
- `merge-augmented-images.py` - **NEW** Merge images from `augmented-output/` into parent folders

### Image Upload & Storage
- `upload-images.js` - Upload images to Supabase storage
- `upload-augmented-to-cloud.js` - Upload augmented images to cloud storage
- `organize_and_upload_images.py` - Organize and upload images with metadata
- `setup_supabase_storage.py` - Initialize Supabase storage buckets
- `verify-upload.js` / `verify-upload.ps1` - Verify upload integrity
- `upload_via_mcp.py` - Upload via MCP protocol

### Frame Extraction
- `afia_frame_extractor.py` - Extract frames from oil bottle videos
- `load-frames-to-supabase.py` - Load extracted frames to Supabase

## Merge Augmented Images

The `merge-augmented-images.py` script consolidates augmented training data by moving images from `oil-bottle-augmented/augmented-output/` subdirectories into their corresponding parent directories.

### Usage

```bash
# Preview what will be merged (dry run)
python scripts/merge-augmented-images.py --dry-run

# Perform the merge
python scripts/merge-augmented-images.py
```

### What It Does

1. Scans `oil-bottle-augmented/augmented-output/` for subdirectories (e.g., `55ml/`, `110ml/`)
2. Moves all images from each subdirectory to the corresponding parent directory in `oil-bottle-augmented/`
3. Skips files that already exist in the target directory (prevents overwrites)
4. Creates target directories if they don't exist
5. Provides progress tracking and summary statistics

### Example

**Before:**
```
oil-bottle-augmented/
├── 55ml/
│   └── (existing images)
└── augmented-output/
    └── 55ml/
        ├── aug-55ml-0001-brightness_plus.jpg
        └── aug-55ml-0002-contrast_minus.jpg
```

**After:**
```
oil-bottle-augmented/
├── 55ml/
│   ├── (existing images)
│   ├── aug-55ml-0001-brightness_plus.jpg
│   └── aug-55ml-0002-contrast_minus.jpg
└── augmented-output/
    └── 55ml/
        └── (empty)
```

### When to Use

- After generating augmented images with `augment-existing-data.js`
- Before uploading consolidated training data to cloud storage
- When organizing training data for model training

## Requirements

- Python 3.9+
- 500+ training samples in Supabase (for training)
- R2/S3 credentials for model deployment
- ~4GB RAM for training
- GPU recommended but not required

## Output

- `models/fill-regressor/v{version}/` - Exported TF.js model
- Model uploaded to R2
- Version registered in Supabase

## Documentation

See `docs/model-training.md` for detailed training guide.
