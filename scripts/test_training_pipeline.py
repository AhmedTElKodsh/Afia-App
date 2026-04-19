#!/usr/bin/env python3
"""
Unit Tests for Training Pipeline
Tests model architecture, evaluation, and data loading
"""

import pytest
import numpy as np
from utils.model_builder import build_fill_regressor, compile_model, unfreeze_top_layers
from utils.evaluation import evaluate_model


def test_model_architecture():
    """Test model is built with correct architecture"""
    model = build_fill_regressor(input_shape=(224, 224, 3), freeze_backbone=True)
    
    # Check input/output shapes
    assert model.input_shape == (None, 224, 224, 3), "Input shape mismatch"
    assert model.output_shape == (None, 1), "Output shape mismatch"
    
    # Check backbone is frozen
    backbone = model.layers[1]
    assert not backbone.trainable, "Backbone should be frozen initially"
    
    # Check model has expected layers
    layer_names = [layer.name for layer in model.layers]
    assert 'fill_percentage' in layer_names, "Missing fill_percentage output layer"


def test_model_compilation():
    """Test model compiles with correct loss and optimizer"""
    model = build_fill_regressor(input_shape=(224, 224, 3), freeze_backbone=True)
    model = compile_model(model, learning_rate=0.001)
    
    # Check optimizer
    assert model.optimizer is not None, "Model should have optimizer"
    assert 'adam' in model.optimizer.__class__.__name__.lower(), "Should use Adam optimizer"
    
    # Check metrics
    metric_names = [m.name for m in model.metrics]
    assert 'mae' in metric_names, "Should have MAE metric"
    assert 'rmse' in metric_names, "Should have RMSE metric"


def test_unfreeze_top_layers():
    """Test unfreezing top layers for fine-tuning"""
    model = build_fill_regressor(input_shape=(224, 224, 3), freeze_backbone=True)
    model = compile_model(model, learning_rate=0.001)
    
    # Get initial trainable count
    initial_trainable = sum([1 for layer in model.layers if layer.trainable])
    
    # Unfreeze top layers
    model = unfreeze_top_layers(model, num_layers=20)
    
    # Check more layers are trainable now
    final_trainable = sum([1 for layer in model.layers if layer.trainable])
    assert final_trainable > initial_trainable, "Should have more trainable layers after unfreezing"


def test_evaluation_metrics():
    """Test evaluation calculates correct metrics"""
    # Mock model that returns fixed predictions
    class MockModel:
        def predict(self, X, verbose=0):
            # Return predictions close to true values
            return np.array([[0.50], [0.55], [0.75], [0.45], [0.90]])
    
    model = MockModel()
    X_test = np.zeros((5, 224, 224, 3))
    y_test = np.array([0.50, 0.55, 0.75, 0.45, 0.90])
    
    metrics = evaluate_model(model, X_test, y_test, threshold=0.10)
    
    # Check all required metrics are present
    assert 'mae' in metrics, "Should have MAE metric"
    assert 'rmse' in metrics, "Should have RMSE metric"
    assert 'accuracy_within_10pct' in metrics, "Should have accuracy metric"
    assert 'median_ae' in metrics, "Should have median AE metric"
    assert 'max_error' in metrics, "Should have max error metric"
    assert 'num_samples' in metrics, "Should have sample count"
    
    # Check values are reasonable
    assert metrics['num_samples'] == 5, "Should count all samples"
    assert metrics['mae'] == 0.0, "Perfect predictions should have 0 MAE"
    assert metrics['accuracy_within_10pct'] == 100.0, "Perfect predictions should have 100% accuracy"


def test_evaluation_with_errors():
    """Test evaluation handles prediction errors correctly"""
    # Mock model with some errors
    class MockModel:
        def predict(self, X, verbose=0):
            # Return predictions with varying errors
            return np.array([[0.60], [0.45], [0.85], [0.30], [0.95]])
    
    model = MockModel()
    X_test = np.zeros((5, 224, 224, 3))
    y_test = np.array([0.50, 0.55, 0.75, 0.45, 0.90])  # True values
    
    metrics = evaluate_model(model, X_test, y_test, threshold=0.10)
    
    # Check MAE is calculated correctly
    # Errors: |0.60-0.50|=0.10, |0.45-0.55|=0.10, |0.85-0.75|=0.10, |0.30-0.45|=0.15, |0.95-0.90|=0.05
    # Mean: (0.10 + 0.10 + 0.10 + 0.15 + 0.05) / 5 = 0.10 = 10%
    expected_mae = 10.0
    assert abs(metrics['mae'] - expected_mae) < 0.01, f"MAE should be {expected_mae}%, got {metrics['mae']}%"
    
    # Check accuracy (4 out of 5 within ±10%)
    expected_accuracy = 80.0
    assert metrics['accuracy_within_10pct'] == expected_accuracy, f"Accuracy should be {expected_accuracy}%"


def test_model_output_range():
    """Test model outputs are in valid range (0-1)"""
    model = build_fill_regressor(input_shape=(224, 224, 3), freeze_backbone=True)
    model = compile_model(model, learning_rate=0.001)
    
    # Create random input
    X_test = np.random.rand(5, 224, 224, 3).astype(np.float32)
    
    # Get predictions
    predictions = model.predict(X_test, verbose=0)
    
    # Check all predictions are in valid range
    assert np.all(predictions >= 0.0), "Predictions should be >= 0"
    assert np.all(predictions <= 1.0), "Predictions should be <= 1"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
