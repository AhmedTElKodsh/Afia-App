# Training Pipeline Usage Guide

## Prerequisites

Before running the training pipeline, ensure you have:

1. **Python 3.9+** installed
2. **500+ training samples** in Supabase `training_samples` table
3. **Environment credentials** for Supabase and R2

## Installation

```bash
cd scripts
pip install -r requirements.txt
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# R2/S3
R2_ENDPOINT=https://account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY=your-access-key
R2_SECRET_KEY=your-secret-key
R2_BUCKET_NAME=afia-oil-tracker
```

## Running Training

### Basic Usage

```bash
python train-fill-regressor.py
```

### With Custom Parameters

```bash
MODEL_VERSION=1.1.0 \
MIN_SAMPLES=1000 \
BATCH_SIZE=64 \
EPOCHS=100 \
python train-fill-regressor.py
```

## Testing

Verify the pipeline structure without running full training:

```bash
python test_training_pipeline.py
```

This will:
- Check all dependencies are installed
- Verify utility modules load correctly
- Test model architecture builds successfully
- Validate prediction output shape

## Expected Output

### Console Output

```
============================================================
TF.js CNN Regressor Training Pipeline
============================================================
✓ Configuration loaded
Querying training samples from Supabase...
Found 24000 training samples
Split distribution: {'train': 19200, 'val': 2400, 'test': 2400}
Preparing train dataset...
  Loaded 50/19200 images...
  ...
✓ train dataset ready: (19200, 224, 224, 3), labels: (19200,)
Building MobileNetV3-Small fill regressor...
✓ Model created: 2,537,985 parameters
  Trainable: 1,024
  Non-trainable: 2,536,961
Compiling model...
✓ Model compiled with Huber loss and Adam optimizer

============================================================
Training phase1
============================================================
Epoch 1/10
600/600 [==============================] - 45s 75ms/step - loss: 0.0234 - mae: 0.0234 - val_loss: 0.0189 - val_mae: 0.0189
...

============================================================
Training phase2
============================================================
Unfreezing top 20 layers for fine-tuning...
✓ Fine-tuning enabled: 1,234,567 trainable parameters
...

============================================================
Test Set Evaluation Results
============================================================
MAE:                    8.5%
RMSE:                   11.2%
Accuracy (±10%):        85.3%
Median Absolute Error:  7.1%
Max Error:              24.8%
Test Samples:           2400
============================================================
✓ TARGET MET: MAE ≤ 10%
✓ TARGET MET: Accuracy ≥ 80%

Exporting model to TF.js format...
✓ Model exported to models/fill-regressor/v1.0.0/tfjs_model

Uploading model to R2...
  Uploaded: models/fill-regressor/v1.0.0/model.json
  Uploaded: models/fill-regressor/v1.0.0/group1-shard1of1.bin
✓ Uploaded 2 files to R2

Updating model registry in Supabase...
✓ Model version 1.0.0 registered
  MAE: 8.50%
  Accuracy: 85.30%
  Training samples: 24000

============================================================
✓ Training pipeline completed successfully!
============================================================
Model version: 1.0.0
MAE: 8.50%
Accuracy (±10%): 85.30%
Model deployed to: models/fill-regressor/v1.0.0/model.json
============================================================
```

### Generated Files

```
models/fill-regressor/v1.0.0/
├── tfjs_model/
│   ├── model.json          # Model architecture (~50KB)
│   └── group1-shard1of1.bin  # Model weights (~5MB)
```

### R2 Deployment

Files uploaded to:
```
s3://afia-oil-tracker/models/fill-regressor/v1.0.0/
├── model.json
└── group1-shard1of1.bin
```

### Supabase Registry

New row in `model_versions` table:

| version | architecture | training_set_size | mae_validation | model_url | is_active |
|---------|--------------|-------------------|----------------|-----------|-----------|
| 1.0.0 | MobileNetV3-Small | 24000 | 8.5 | https://r2.../models/fill-regressor/v1.0.0/model.json | true |

## Troubleshooting

### Missing Dependencies

```
✗ TensorFlow import failed: No module named 'tensorflow'
```

**Solution**: Install dependencies
```bash
pip install -r requirements.txt
```

### Insufficient Training Data

```
ValueError: Insufficient training samples: 300 < 500 required
```

**Solution**: Collect more training data via:
- PWA scans with user feedback
- Admin dashboard uploads
- Run augmentation pipeline (Story 7.2)

### Environment Variables Not Set

```
Configuration error: Missing required environment variables: SUPABASE_URL, R2_ENDPOINT
```

**Solution**: Create `.env` file with credentials
```bash
cp .env.example .env
nano .env  # Add your credentials
```

### R2 Upload Failed

```
botocore.exceptions.ClientError: An error occurred (403) when calling the PutObject operation: Forbidden
```

**Solution**: Verify R2 credentials
- Check `R2_ACCESS_KEY` and `R2_SECRET_KEY` are correct
- Ensure R2 bucket exists and is accessible
- Verify endpoint URL format

### High MAE (> 10%)

```
✗ Training failed: MAE 15.2% > 10% target
```

**Solutions**:
- Collect more diverse training samples (target 1000+)
- Balance dataset across fill levels
- Increase training epochs
- Adjust learning rate

## Next Steps

After successful training:

1. **Verify Model**: Check R2 bucket for uploaded files
2. **Test Locally**: Load model in Node.js TF.js environment
3. **Integrate Client**: Proceed to Story 7.4 (Client-Side Model Integration)
4. **Monitor Performance**: Track MAE in production

## Documentation

For detailed information, see:
- `docs/model-training.md` - Complete training guide
- `scripts/README.md` - Scripts overview
- Story 7.3 - Implementation details

## Support

For issues or questions:
1. Check `docs/model-training.md` troubleshooting section
2. Review Story 7.3 acceptance criteria
3. Verify environment configuration
4. Check Supabase and R2 connectivity
