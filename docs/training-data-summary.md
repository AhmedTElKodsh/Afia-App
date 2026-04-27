# Training Data Summary

## Overview

This document summarizes the existing training data and the augmentation strategy for the Afia Oil Tracker local model training pipeline.

## Data Sources

### 1. Original Video Frames
**Location:** `D:\AI Projects\Freelance\Afia-App\oil-bottle-frames`

**Statistics:**
- **Total frames:** 2,356 high-quality images
- **Source:** 29 videos of oil bottles at different fill levels
- **Quality filtering:**
  - Total extracted: 3,464 frames
  - Blurry frames removed: 822
  - Duplicate frames removed: 286
  - Final saved: 2,356 frames

**Organization:**
- 29 folders organized by fill level (55ml, 110ml, 165ml, ..., 1500ml, empty)
- Each folder contains frames from videos at that specific fill level
- Naming convention: `{fillLevel}_t{timestamp}s_f{frame}.jpg`
  - Example: `550ml_t0012.52s_f0025.jpg`

### 2. Existing Augmented Data
**Location:** `D:\AI Projects\Freelance\Afia-App\oil-bottle-augmented`

**Statistics:**
- **Original images:** 2,356 (copied from frames folder with `orig_` prefix)
- **Augmented images:** 5,303 (4 variants per original)
- **Total images:** 7,659

**Augmentation Pattern:**
- 4 variants per original image
- Appears to be temporal/video-based augmentations
- Naming convention: `aug_{variant}_{fillLevel}_t{timestamp}s_f{frame}.jpg`
  - Example: `aug_000_550ml_t0012.52s_f0025.jpg`

## Story 7.2 Requirements

Story 7.2 requires **10 transformation-based variants** per training image:

1. **brightness_plus** - Brightness +20%
2. **brightness_minus** - Brightness -20%
3. **contrast_plus** - Contrast +15%
4. **contrast_minus** - Contrast -15%
5. **flip_horizontal** - Horizontal flip
6. **rotate_plus** - Rotation +5°
7. **rotate_minus** - Rotation -5°
8. **jpeg_quality_low** - JPEG quality 60 (0.6)
9. **jpeg_quality_mid** - JPEG quality 70 (0.7)
10. **jpeg_quality_high** - JPEG quality 85 (0.85)

## Gap Analysis

### Current State
- ✅ **2,356 original frames** - High quality, diverse fill levels
- ✅ **5,303 existing augmented images** - 4 variants per frame (temporal)
- ❌ **Missing:** 10 transformation variants per frame (Story 7.2 requirement)

### What's Needed
- Generate **10 transformation variants** for each of the 2,356 original frames
- Total new augmented images: **23,560**
- Combined with originals: **25,916 total training images**

## Augmentation Strategy

### Approach
Use the **original frames** from `oil-bottle-frames` as the base for Story 7.2 augmentation:

1. **Source:** `D:\AI Projects\Freelance\Afia-App\oil-bottle-frames` (2,356 frames)
2. **Process:** Apply 10 transformation variants to each frame
3. **Output:** Local folder first, then optionally upload to B2 + Supabase

### Why Use Original Frames?
- **Highest quality:** Original frames are unmodified, highest quality
- **Consistent base:** All augmentations start from the same quality baseline
- **Proper transformations:** Story 7.2 requires specific transformation types (brightness, contrast, rotation, etc.)
- **Separate concerns:** Existing augmented data serves a different purpose (temporal variations)

### Implementation Script
**Script:** `scripts/augment-existing-data.js`

**Features:**
- Reads original frames from `oil-bottle-frames`
- Generates all 10 Story 7.2 transformation variants
- Outputs to local `augmented-output/` folder
- Preserves fill level organization
- Supports dry-run mode for testing
- Supports limit parameter for partial processing

**Usage:**
```bash
# Dry run to preview (first 10 images)
node scripts/augment-existing-data.js --dry-run --limit=10

# Process all images
node scripts/augment-existing-data.js

# Process with limit
node scripts/augment-existing-data.js --limit=100
```

## Expected Output

### Full Dataset (All 2,356 Frames)
- **Original frames:** 2,356
- **Augmented variants:** 23,560 (10 per frame)
- **Total training images:** 25,916
- **Storage estimate:** ~15-20 GB (assuming ~800KB per image)

### Naming Convention
Output files will follow Story 7.2 naming:
- `aug-{fillLevel}-{frame}-{variantName}.jpg`
- Example: `aug-550ml-0025-brightness_plus.jpg`

### Organization
```
augmented-output/
├── 55ml/
│   ├── aug-55ml-0000-brightness_plus.jpg
│   ├── aug-55ml-0000-brightness_minus.jpg
│   ├── aug-55ml-0000-contrast_plus.jpg
│   └── ...
├── 110ml/
│   └── ...
├── 165ml/
│   └── ...
└── ...
```

## Next Steps

### Phase 1: Generate Augmented Images ✅
- [x] Create augmentation script
- [x] Test with dry-run mode
- [ ] Run full augmentation (2,356 frames × 10 variants)
- [ ] Verify output quality

### Phase 1.5: Merge Augmented Images (Optional)
- [x] Create merge script (`scripts/merge-augmented-images.py`)
- [ ] Run merge to consolidate `augmented-output/` into parent directories
- [ ] Verify merged images

**Usage:**
```bash
# Preview merge (dry run)
python scripts/merge-augmented-images.py --dry-run

# Perform merge
python scripts/merge-augmented-images.py
```

### Phase 2: Upload to B2 Storage (Optional)
- [ ] Configure B2 credentials
- [ ] Upload augmented images to B2
- [ ] Verify upload integrity

### Phase 3: Create Supabase Records (Optional)
- [ ] Create training_samples records for each augmented image
- [ ] Link to original frame metadata
- [ ] Set proper source_type and metadata fields

### Phase 4: Story 7.3 - Model Training
- [ ] Use augmented dataset to train TF.js CNN model
- [ ] Validate model performance
- [ ] Deploy model for client-side inference

## Data Comparison

| Dataset | Location | Images | Purpose |
|---------|----------|--------|---------|
| **Original Frames** | `oil-bottle-frames` | 2,356 | Base training data |
| **Existing Augmented** | `oil-bottle-augmented` | 7,659 | Temporal variations (4 per frame) |
| **Story 7.2 Augmented** | `augmented-output` | 23,560 | Transformation variants (10 per frame) |
| **Total Available** | Combined | 33,575 | Complete training dataset |

## Recommendations

1. **Keep all datasets:** Each serves a different purpose
   - Original frames: Highest quality baseline
   - Existing augmented: Temporal/video variations
   - Story 7.2 augmented: Transformation variations

2. **Start with Story 7.2 augmentation:** This is required for the training pipeline

3. **Test with subset first:** Run augmentation on 100-200 frames to verify quality

4. **Monitor storage:** 25,916 images will require significant storage (~15-20 GB)

5. **Consider cloud storage:** Upload to B2 for persistence and accessibility

## References

- [Story 7.2: Training Data Augmentation Pipeline](../_bmad-output/implementation-artifacts/7-2-training-data-augmentation-pipeline.md)
- [Training Pipeline Documentation](./training-pipeline.md)
- [Augmentation Script](../scripts/augment-existing-data.js)
- [Analysis Script](../scripts/analyze-augmented-data.js)
