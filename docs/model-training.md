# Model Training Guide

## Overview

This document describes the training process for the Afia Oil Tracker fill-level regressor model. The model uses MobileNetV3-Small architecture with a regression head to predict oil fill percentages from bottle images.

## Model Architecture

```
Input: 224x224x3 RGB image
↓
MobileNetV3-Small (pre-trained on ImageNet)
↓
GlobalAveragePooling2D
↓
Dropout(0.2)
↓
Dense(1, activation='sigmoid')
↓
Output: fill_percentage (0-1 range)
```

### Architecture Details

- **Backbone**: MobileNetV3-Small pre-trained on ImageNet
- **Parameters**: ~2.5M total, ~1.5M trainable after freezing
- **Input Size**: 224×224×3 RGB
- **Output**: Single value (0-1) representing fill percentage
- **Model Size**: ~5MB after TF.js conversion

## Training Strategy

### Two-Phase Training

**Phase 1: Train Regression Head (10 epochs)**
- Freeze backbone weights
- Train only the regression head (Dense layer)
- Learning rate: 0.001
- Purpose: Learn task-specific features quickly

**Phase 2: Fine-Tune Backbone (up to 50 epochs)**
- Unfreeze top 20 layers of backbone
- Lower learning rate: 0.0001
- Early stopping with patience=5
- Purpose: Adapt pre-trained features to oil bottles

### Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Batch Size | 32 | Balance between speed and stability |
| Learning Rate (Phase 1) | 0.001 | Standard for Adam optimizer |
| Learning Rate (Phase 2) | 0.0001 | Lower for fine-tuning |
| Loss Function | Huber (δ=0.1) | Robust to outliers |
| Optimizer | Adam | Adaptive learning rates |
| Early Stopping Patience | 5 epochs | Prevent overfitting |
| Dropout | 0.2 | Regularization |

### Data Split

- **Train**: 80% of samples
- **Validation**: 10% of samples
- **Test**: 10% of samples

Split is assigned at data collection time and stored in Supabase `training_samples.metadata.split`.

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| MAE | ≤ 10% | Acceptable error for user experience |
| Accuracy (±10%) | ≥ 80% | Most predictions within acceptable range |
| Inference Time | < 50ms | Real-time user experience |
| Model Size | ≤ 5MB | Fast download on mobile networks |

## Training Prerequisites

### Minimum Data Requirements

- **500+ base training samples** from Supabase
- Samples must have:
  - Valid `image_url` (accessible from R2/B2)
  - `label_percentage` (0-100)
  - `metadata.split` ('train', 'val', or 'test')
  - `sku` (bottle identifier)

### Environment Setup

1. **Python 3.9+** with pip
2. **Dependencies** (see `scripts/requirements.txt`):
   - tensorflow==2.15.0
   - tensorflowjs==4.17.0
   - Pillow==10.2.0
   - supabase==2.3.4
   - boto3==1.34.51

3. **Environment Variables**:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   R2_ENDPOINT=https://account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY=your-r2-access-key
   R2_SECRET_KEY=your-r2-secret-key
   R2_BUCKET_NAME=afia-oil-tracker
   ```

## Running Training

### Installation

```bash
cd scripts
pip install -r requirements.txt
```

### Configure Environment

```bash
# Copy example and edit
cp .env.example .env
nano .env  # Add your credentials
```

### Run Training

```bash
python train-fill-regressor.py
```

### Optional Parameters

Override defaults via environment variables:

```bash
MIN_SAMPLES=1000 \
BATCH_SIZE=64 \
EPOCHS=100 \
LEARNING_RATE=0.0005 \
MODEL_VERSION=1.1.0 \
python train-fill-regressor.py
```

## Training Output

### Console Output

The script logs:
- Configuration validation
- Data loading progress
- Training progress (loss, MAE per epoch)
- Evaluation metrics
- Export and deployment status

### Generated Files

```
models/fill-regressor/v1.0.0/
├── tfjs_model/
│   ├── model.json          # Model architecture
│   └── group1-shard1of1.bin  # Model weights
```

### R2 Deployment

Files are uploaded to:
```
s3://afia-oil-tracker/models/fill-regressor/v1.0.0/
├── model.json
└── group1-shard1of1.bin
```

### Supabase Registry

A record is inserted into `model_versions` table:

```sql
INSERT INTO model_versions (
  version,
  architecture,
  training_set_size,
  mae_validation,
  model_url,
  is_active
) VALUES (
  '1.0.0',
  'MobileNetV3-Small',
  24000,
  8.5,
  'https://r2.../models/fill-regressor/v1.0.0/model.json',
  true
);
```

## Evaluation Metrics

### Mean Absolute Error (MAE)

- **Definition**: Average absolute difference between predicted and true fill percentages
- **Target**: ≤ 10%
- **Example**: If true fill is 50%, predictions should be 40-60%

### Accuracy Within ±10%

- **Definition**: Percentage of predictions within 10 percentage points of true value
- **Target**: ≥ 80%
- **Example**: 80% of predictions are within acceptable error range

### Root Mean Squared Error (RMSE)

- **Definition**: Square root of average squared errors
- **Use**: Penalizes large errors more than MAE
- **Typical**: 12-15% for good models

## Troubleshooting

### Insufficient Training Data

**Error**: `ValueError: Insufficient training samples: 300 < 500 required`

**Solution**:
- Collect more scans via PWA
- Use admin dashboard to upload and label images
- Run augmentation pipeline (Story 7.2) to generate variants

### High MAE (> 10%)

**Possible Causes**:
1. **Insufficient data**: Need more diverse samples
2. **Class imbalance**: Uneven distribution of fill levels
3. **Poor image quality**: Blurry, dark, or occluded images
4. **Label noise**: Incorrect ground truth labels

**Solutions**:
- Increase training data (target 1000+ base samples)
- Balance dataset across fill levels (0-25%, 25-50%, 50-75%, 75-100%)
- Filter low-quality images
- Review and correct labels in admin dashboard

### Model Not Converging

**Symptoms**: Loss not decreasing, validation MAE stuck

**Solutions**:
- Reduce learning rate (try 0.0005 or 0.0001)
- Increase batch size (try 64)
- Check data preprocessing (images should be normalized 0-1)
- Verify labels are in correct range (0-1, not 0-100)

### R2 Upload Failures

**Error**: `botocore.exceptions.ClientError`

**Solutions**:
- Verify R2 credentials are correct
- Check R2 endpoint URL format
- Ensure bucket exists and is accessible
- Verify network connectivity

## Retraining

### When to Retrain

- **New data available**: 500+ new labeled samples
- **Performance degradation**: MAE increases in production
- **New bottle types**: SKUs not in training set
- **Seasonal changes**: Lighting conditions vary

### Retraining Process

1. **Collect new data**: Via PWA scans and admin corrections
2. **Run augmentation**: Generate variants for new samples
3. **Increment version**: Set `MODEL_VERSION=1.1.0`
4. **Train new model**: Run training script
5. **Evaluate**: Compare metrics to previous version
6. **Deploy**: Set `is_active=true` in Supabase
7. **Monitor**: Track performance in production

### Version Management

- Use semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR**: Architecture changes
- **MINOR**: Significant data additions or retraining
- **PATCH**: Hyperparameter tuning or bug fixes

## Model Deployment

### Automatic Deployment

The training script automatically:
1. Exports model to TF.js format
2. Uploads to R2 at `models/fill-regressor/v{version}/`
3. Registers version in Supabase `model_versions` table
4. Sets `is_active=true` for first model

### Manual Deployment

If needed, manually update active model:

```sql
-- Deactivate old version
UPDATE model_versions SET is_active = false WHERE version = '1.0.0';

-- Activate new version
UPDATE model_versions SET is_active = true WHERE version = '1.1.0';
```

### Client Integration

The PWA (Story 7.4) will:
1. Query Supabase for active model version
2. Download model from R2 if not cached
3. Cache in IndexedDB for offline use
4. Check for updates on app launch

## Performance Monitoring

### Metrics to Track

- **MAE**: Should remain ≤ 10% in production
- **Inference time**: Should be < 50ms on target devices
- **Model size**: Should be ≤ 5MB for fast downloads
- **Cache hit rate**: Percentage of offline inferences

### Production Validation

After deployment:
1. Test on real devices (iOS Safari, Android Chrome)
2. Measure inference latency
3. Verify offline functionality
4. Monitor user feedback and corrections

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [MobileNetV3 Paper](https://arxiv.org/abs/1905.02244)
- [Huber Loss](https://en.wikipedia.org/wiki/Huber_loss)
- Story 7.3: TF.js CNN Regressor Training & Deployment
- Story 7.4: Client-Side Model Integration
- Story 7.5: Model Version Management

---

**Last Updated**: 2026-04-17  
**Model Version**: 1.0.0  
**Author**: Development Team
