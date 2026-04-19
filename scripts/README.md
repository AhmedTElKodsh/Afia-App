# Training Scripts

This directory contains Python scripts for training the fill-level regressor model.

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

## Files

- `train-fill-regressor.py` - Main training script
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variable template
- `utils/` - Utility modules
  - `data_loader.py` - Supabase data loading and image preprocessing
  - `model_builder.py` - Model architecture and compilation
  - `evaluation.py` - Model evaluation and metrics

## Requirements

- Python 3.9+
- 500+ training samples in Supabase
- R2/S3 credentials for model deployment
- ~4GB RAM for training
- GPU recommended but not required

## Output

- `models/fill-regressor/v{version}/` - Exported TF.js model
- Model uploaded to R2
- Version registered in Supabase

## Documentation

See `docs/model-training.md` for detailed training guide.
