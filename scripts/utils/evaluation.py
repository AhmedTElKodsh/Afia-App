"""
Model Evaluation Utilities
Calculates MAE, accuracy within threshold, and generates reports
"""

import logging
from typing import Dict, Tuple
import numpy as np
import tensorflow as tf
from tensorflow import keras

logger = logging.getLogger(__name__)

def evaluate_model(
    model: keras.Model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    threshold: float = 0.10
) -> Dict[str, float]:
    """
    Evaluate model on test set
    
    Args:
        model: Trained Keras model
        X_test: Test images
        y_test: Test labels (0-1 range)
        threshold: Accuracy threshold (default ±10%)
        
    Returns:
        Dictionary of evaluation metrics
    """
    logger.info("Evaluating model on test set...")
    
    # Get predictions
    y_pred = model.predict(X_test, verbose=0).flatten()
    
    # Calculate MAE (as percentage)
    mae = np.mean(np.abs(y_pred - y_test)) * 100
    
    # Calculate RMSE (as percentage)
    rmse = np.sqrt(np.mean((y_pred - y_test) ** 2)) * 100
    
    # Calculate accuracy within threshold
    within_threshold = np.abs(y_pred - y_test) <= threshold
    accuracy = np.mean(within_threshold) * 100
    
    # Calculate median absolute error
    median_ae = np.median(np.abs(y_pred - y_test)) * 100
    
    # Calculate max error
    max_error = np.max(np.abs(y_pred - y_test)) * 100
    
    metrics = {
        'mae': float(mae),
        'rmse': float(rmse),
        'accuracy_within_10pct': float(accuracy),
        'median_ae': float(median_ae),
        'max_error': float(max_error),
        'num_samples': len(y_test)
    }
    
    logger.info("=" * 60)
    logger.info("Test Set Evaluation Results")
    logger.info("=" * 60)
    logger.info(f"MAE:                    {mae:.2f}%")
    logger.info(f"RMSE:                   {rmse:.2f}%")
    logger.info(f"Accuracy (±10%):        {accuracy:.2f}%")
    logger.info(f"Median Absolute Error:  {median_ae:.2f}%")
    logger.info(f"Max Error:              {max_error:.2f}%")
    logger.info(f"Test Samples:           {len(y_test)}")
    logger.info("=" * 60)
    
    # Check if target met
    if mae <= 10.0:
        logger.info("✓ TARGET MET: MAE ≤ 10%")
    else:
        logger.warning(f"✗ TARGET NOT MET: MAE {mae:.2f}% > 10%")
    
    if accuracy >= 80.0:
        logger.info("✓ TARGET MET: Accuracy ≥ 80%")
    else:
        logger.warning(f"✗ TARGET NOT MET: Accuracy {accuracy:.2f}% < 80%")
    
    return metrics

def generate_sample_predictions(
    model: keras.Model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    num_samples: int = 10
) -> None:
    """
    Generate and log sample predictions
    
    Args:
        model: Trained model
        X_test: Test images
        y_test: Test labels
        num_samples: Number of samples to show
    """
    logger.info("\nSample Predictions:")
    logger.info("-" * 60)
    
    # Get random samples
    indices = np.random.choice(len(y_test), size=min(num_samples, len(y_test)), replace=False)
    
    predictions = model.predict(X_test[indices], verbose=0).flatten()
    
    for i, idx in enumerate(indices):
        true_val = y_test[idx] * 100
        pred_val = predictions[i] * 100
        error = abs(pred_val - true_val)
        
        logger.info(f"Sample {i+1}: True={true_val:.1f}%, Pred={pred_val:.1f}%, Error={error:.1f}%")
    
    logger.info("-" * 60)
