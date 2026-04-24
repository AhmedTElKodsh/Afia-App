#!/usr/bin/env python3
"""
TF.js CNN Regressor Training Script
Trains a MobileNetV3-Small model for fill-level prediction
Target: MAE ≤ 10%, Inference < 50ms
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
import subprocess

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import callbacks
import boto3
from dotenv import load_dotenv

# Import utilities
sys.path.append(str(Path(__file__).parent))
from utils.data_loader import TrainingDataLoader
from utils.model_builder import build_fill_regressor, compile_model, unfreeze_top_layers
from utils.evaluation import evaluate_model, generate_sample_predictions

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
IMG_SIZE = (224, 224)
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '32'))
EPOCHS = int(os.getenv('EPOCHS', '50'))
EARLY_STOPPING_PATIENCE = 5
LEARNING_RATE = float(os.getenv('LEARNING_RATE', '0.001'))
MIN_SAMPLES_REQUIRED = int(os.getenv('MIN_SAMPLES', '500'))
MODEL_VERSION = os.getenv('MODEL_VERSION', '1.0.0')

class TrainingConfig:
    """Training configuration"""
    def __init__(self):
        # Load .env file if exists
        load_dotenv()
        
        # Environment variables
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        self.r2_endpoint = os.getenv('R2_ENDPOINT')
        self.r2_access_key = os.getenv('R2_ACCESS_KEY')
        self.r2_secret_key = os.getenv('R2_SECRET_KEY')
        self.r2_bucket = os.getenv('R2_BUCKET_NAME', 'afia-oil-tracker')
        self.model_version = MODEL_VERSION
        
        # Validate required env vars
        self._validate()
    
    def _validate(self):
        """Validate required environment variables"""
        required = [
            'SUPABASE_URL', 'SUPABASE_SERVICE_KEY',
            'R2_ENDPOINT', 'R2_ACCESS_KEY', 'R2_SECRET_KEY'
        ]
        missing = [var for var in required if not os.getenv(var)]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        
        # Validate URL formats
        if not self.supabase_url.startswith('https://'):
            raise ValueError("SUPABASE_URL must start with https://")
        if not self.r2_endpoint.startswith('https://'):
            raise ValueError("R2_ENDPOINT must start with https://")

def train_model(
    model: keras.Model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    phase: str = "phase1"
) -> keras.callbacks.History:
    """
    Train model with callbacks
    
    Args:
        model: Keras model
        X_train, y_train: Training data
        X_val, y_val: Validation data
        phase: Training phase name
        
    Returns:
        Training history
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"Training {phase}")
    logger.info(f"{'='*60}")
    
    # Callbacks
    early_stop = callbacks.EarlyStopping(
        monitor='val_mae',
        patience=EARLY_STOPPING_PATIENCE,
        restore_best_weights=True,
        verbose=1
    )
    
    reduce_lr = callbacks.ReduceLROnPlateau(
        monitor='val_mae',
        factor=0.5,
        patience=3,
        min_lr=1e-7,
        verbose=1
    )
    
    # Train
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        batch_size=BATCH_SIZE,
        epochs=EPOCHS if phase == "phase2" else 10,
        callbacks=[early_stop, reduce_lr],
        verbose=1
    )
    
    return history

def export_to_tfjs(model: keras.Model, output_dir: str) -> None:
    """
    Export model to TF.js format
    
    Args:
        model: Trained Keras model
        output_dir: Output directory path
    """
    logger.info(f"\nExporting model to TF.js format...")
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Save as Keras model first
    temp_model_path = f"{output_dir}/temp_model"
    model.save(temp_model_path)
    
    # Convert to TF.js
    tfjs_path = f"{output_dir}/tfjs_model"
    cmd = [
        'tensorflowjs_converter',
        '--input_format=keras',
        '--output_format=tfjs_layers_model',
        temp_model_path,
        tfjs_path
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        logger.error(f"TF.js conversion failed: {result.stderr}")
        raise RuntimeError("TF.js conversion failed")
    
    logger.info(f"✓ Model exported to {tfjs_path}")
    
    # Clean up temp model
    import shutil
    shutil.rmtree(temp_model_path)
    
    return tfjs_path

def upload_to_r2(
    local_dir: str,
    r2_key_prefix: str,
    config: TrainingConfig
) -> List[str]:
    """
    Upload model files to R2
    
    Args:
        local_dir: Local directory with model files
        r2_key_prefix: R2 key prefix (e.g., models/fill-regressor/v1.0.0/)
        config: Training configuration
        
    Returns:
        List of uploaded file keys
    """
    logger.info(f"\nUploading model to R2...")
    
    # Initialize S3 client for R2
    s3 = boto3.client(
        's3',
        endpoint_url=config.r2_endpoint,
        aws_access_key_id=config.r2_access_key,
        aws_secret_access_key=config.r2_secret_key
    )
    
    uploaded_files = []
    
    # Upload all files in directory
    for file_path in Path(local_dir).rglob('*'):
        if file_path.is_file():
            # Calculate relative path
            rel_path = file_path.relative_to(local_dir)
            r2_key = f"{r2_key_prefix}/{rel_path}"
            
            # Upload
            s3.upload_file(
                str(file_path),
                config.r2_bucket,
                r2_key,
                ExtraArgs={'ContentType': 'application/octet-stream'}
            )
            
            uploaded_files.append(r2_key)
            logger.info(f"  Uploaded: {r2_key}")
    
    logger.info(f"✓ Uploaded {len(uploaded_files)} files to R2")
    
    return uploaded_files

def update_model_registry(
    config: TrainingConfig,
    metrics: Dict[str, float],
    r2_key: str,
    training_samples_count: int
) -> None:
    """
    Insert model version into Supabase registry
    
    Args:
        config: Training configuration
        metrics: Evaluation metrics
        r2_key: R2 path to model
        training_samples_count: Number of training samples
    """
    logger.info("\nUpdating model registry in Supabase...")
    
    from supabase import create_client
    
    client = create_client(config.supabase_url, config.supabase_key)
    
    # Prepare record for model_versions table (Matches Story 7.5 Schema)
    record = {
        'version': config.model_version,
        'architecture': config.architecture,
        'mae': round(metrics['mae'], 4),
        'val_accuracy': round(metrics['accuracy_within_10pct'], 4),
        'training_samples_count': training_samples_count,
        'r2_key': r2_key,
        'is_active': True,  # First model is active
        'deployed_at': datetime.utcnow().isoformat(),
        'notes': f"Automated training pipeline run. Architecture: {config.architecture}"
    }
    
    # Insert
    response = client.table('model_versions').insert(record).execute()
    
    logger.info(f"✓ Model version {config.model_version} registered")
    logger.info(f"  MAE: {metrics['mae']:.2f}%")
    logger.info(f"  Accuracy: {metrics['accuracy_within_10pct']:.2f}%")
    logger.info(f"  Training samples: {training_samples_count}")
    logger.info(f"  Note: Additional metrics logged but not persisted (schema limitation)")

def main():
    """Main training pipeline"""
    logger.info("=" * 60)
    logger.info("TF.js CNN Regressor Training Pipeline")
    logger.info("=" * 60)
    
    # Load configuration
    try:
        config = TrainingConfig()
        logger.info("✓ Configuration loaded")
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        logger.info("\nPlease set required environment variables:")
        logger.info("  SUPABASE_URL, SUPABASE_SERVICE_KEY")
        logger.info("  R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY")
        logger.info("\nSee scripts/.env.example for template")
        sys.exit(1)
    
    # Step 1: Load training samples
    data_loader = TrainingDataLoader(config.supabase_url, config.supabase_key)
    
    try:
        samples = data_loader.get_training_samples(MIN_SAMPLES_REQUIRED)
    except ValueError as e:
        logger.error(f"Insufficient training data: {e}")
        sys.exit(1)
    
    # Step 2: Prepare datasets
    X_train, y_train = data_loader.prepare_dataset(samples, 'train', IMG_SIZE)
    X_val, y_val = data_loader.prepare_dataset(samples, 'val', IMG_SIZE)
    X_test, y_test = data_loader.prepare_dataset(samples, 'test', IMG_SIZE)
    
    # Step 3: Build model
    model = build_fill_regressor(input_shape=(*IMG_SIZE, 3), freeze_backbone=True)
    model = compile_model(model, LEARNING_RATE)
    
    # Step 4: Train Phase 1 (frozen backbone)
    history1 = train_model(model, X_train, y_train, X_val, y_val, phase="phase1")
    
    # Step 5: Train Phase 2 (fine-tune top layers)
    model = unfreeze_top_layers(model, num_layers=20)
    model = compile_model(model, LEARNING_RATE / 10)  # Lower LR for fine-tuning
    history2 = train_model(model, X_train, y_train, X_val, y_val, phase="phase2")
    
    # Step 6: Evaluate on test set
    metrics = evaluate_model(model, X_test, y_test, threshold=0.10)
    generate_sample_predictions(model, X_test, y_test, num_samples=10)
    
    # Check if target met
    if metrics['mae'] > 10.0:
        logger.error(f"\n✗ Training failed: MAE {metrics['mae']:.2f}% > 10% target")
        logger.error("Consider:")
        logger.error("  - Collecting more training data")
        logger.error("  - Adjusting hyperparameters")
        logger.error("  - Increasing training epochs")
        sys.exit(1)
    
    # Step 7: Export to TF.js
    output_dir = f"models/fill-regressor/v{config.model_version}"
    tfjs_path = export_to_tfjs(model, output_dir)
    
    # Step 8: Upload to R2
    r2_key_prefix = f"models/fill-regressor/v{config.model_version}"
    uploaded_files = upload_to_r2(tfjs_path, r2_key_prefix, config)
    
    # Step 9: Update model registry
    update_model_registry(
        config,
        metrics,
        f"{r2_key_prefix}/model.json",
        len(samples)
    )
    
    # Step 10: Export training history
    history_data = {
        'model_version': config.model_version,
        'phase1': {
            'loss': [float(x) for x in history1.history['loss']],
            'val_loss': [float(x) for x in history1.history['val_loss']],
            'mae': [float(x) for x in history1.history['mae']],
            'val_mae': [float(x) for x in history1.history['val_mae']]
        },
        'phase2': {
            'loss': [float(x) for x in history2.history['loss']],
            'val_loss': [float(x) for x in history2.history['val_loss']],
            'mae': [float(x) for x in history2.history['mae']],
            'val_mae': [float(x) for x in history2.history['val_mae']]
        },
        'final_metrics': metrics,
        'config': {
            'batch_size': BATCH_SIZE,
            'epochs': EPOCHS,
            'learning_rate': LEARNING_RATE,
            'min_samples': MIN_SAMPLES_REQUIRED
        }
    }
    
    history_path = f"{output_dir}/training_history.json"
    with open(history_path, 'w') as f:
        json.dump(history_data, f, indent=2)
    
    logger.info(f"✓ Training history saved to {history_path}")
    
    logger.info("\n" + "=" * 60)
    logger.info("✓ Training pipeline completed successfully!")
    logger.info("=" * 60)
    logger.info(f"Model version: {config.model_version}")
    logger.info(f"MAE: {metrics['mae']:.2f}%")
    logger.info(f"Accuracy (±10%): {metrics['accuracy_within_10pct']:.2f}%")
    logger.info(f"Model deployed to: {r2_key_prefix}/model.json")
    logger.info(f"Training history: {history_path}")
    logger.info("=" * 60)

if __name__ == '__main__':
    main()
