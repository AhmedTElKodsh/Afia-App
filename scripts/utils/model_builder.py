"""
Model Builder for Fill-Level Regressor
Uses MobileNetV3-Small backbone with regression head
"""

import logging
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

logger = logging.getLogger(__name__)

def build_fill_regressor(
    input_shape: tuple = (224, 224, 3),
    freeze_backbone: bool = True
) -> keras.Model:
    """
    Build MobileNetV3-Small fill-level regressor
    
    Args:
        input_shape: Input image shape (height, width, channels)
        freeze_backbone: Whether to freeze backbone weights initially
        
    Returns:
        Compiled Keras model
    """
    logger.info("Building MobileNetV3-Small fill regressor...")
    
    # Load MobileNetV3-Small pre-trained on ImageNet
    backbone = keras.applications.MobileNetV3Small(
        input_shape=input_shape,
        include_top=False,  # Remove classification head
        weights='imagenet',
        pooling=None
    )
    
    # Freeze backbone if requested
    if freeze_backbone:
        backbone.trainable = False
        logger.info("✓ Backbone frozen (will fine-tune later)")
    else:
        logger.info("✓ Backbone trainable")
    
    # Build regression head
    inputs = keras.Input(shape=input_shape)
    x = backbone(inputs, training=False)
    
    # Global average pooling
    x = layers.GlobalAveragePooling2D()(x)
    
    # Dropout for regularization
    x = layers.Dropout(0.2)(x)
    
    # Regression output (0-1 range)
    outputs = layers.Dense(1, activation='sigmoid', name='fill_percentage')(x)
    
    # Create model
    model = keras.Model(inputs=inputs, outputs=outputs, name='fill_regressor')
    
    logger.info(f"✓ Model created: {model.count_params():,} parameters")
    logger.info(f"  Trainable: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
    logger.info(f"  Non-trainable: {sum([tf.size(w).numpy() for w in model.non_trainable_weights]):,}")
    
    return model

def compile_model(
    model: keras.Model,
    learning_rate: float = 0.001
) -> keras.Model:
    """
    Compile model with Huber loss and Adam optimizer
    
    Args:
        model: Keras model to compile
        learning_rate: Initial learning rate
        
    Returns:
        Compiled model
    """
    logger.info("Compiling model...")
    
    # Huber loss (robust to outliers)
    loss = keras.losses.Huber(delta=0.1)
    
    # Adam optimizer with learning rate scheduling
    optimizer = keras.optimizers.Adam(learning_rate=learning_rate)
    
    # Metrics
    metrics = [
        keras.metrics.MeanAbsoluteError(name='mae'),
        keras.metrics.RootMeanSquaredError(name='rmse')
    ]
    
    model.compile(
        optimizer=optimizer,
        loss=loss,
        metrics=metrics
    )
    
    logger.info("✓ Model compiled with Huber loss and Adam optimizer")
    
    return model

def unfreeze_top_layers(model: keras.Model, num_layers: int = 20) -> keras.Model:
    """
    Unfreeze top N layers of backbone for fine-tuning
    
    Args:
        model: Compiled model
        num_layers: Number of top layers to unfreeze
        
    Returns:
        Model with unfrozen layers
    """
    logger.info(f"Unfreezing top {num_layers} layers for fine-tuning...")
    
    # Get backbone (first layer)
    backbone = model.layers[1]
    
    # Unfreeze top layers
    backbone.trainable = True
    for layer in backbone.layers[:-num_layers]:
        layer.trainable = False
    
    trainable_count = sum([tf.size(w).numpy() for w in model.trainable_weights])
    logger.info(f"✓ Fine-tuning enabled: {trainable_count:,} trainable parameters")
    
    return model
