#!/usr/bin/env python3
"""
Local Fill-Level Regressor Training Script
Trains MobileNetV3-Small on local image directories — no Supabase/R2 required.

Label mapping: folder name → fill fraction (0.0–1.0)
  "empty"     → 0.0
  "110ml"     → 110 / 1500 = 0.073
  "1500ml"    → 1.0
  "1.5L_refs" → 1.0

Usage:
  python train-fill-regressor-local.py
  EPOCHS=100 BATCH_SIZE=16 python train-fill-regressor-local.py
"""

import os
import sys
import json
import random
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Dict

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import callbacks

sys.path.append(str(Path(__file__).parent))
from utils.model_builder import build_fill_regressor, compile_model, unfreeze_top_layers

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────

BOTTLE_CAPACITY_ML = 1500
IMG_SIZE = (224, 224)
BATCH_SIZE = int(os.getenv('BATCH_SIZE', '32'))
EPOCHS_PHASE1 = int(os.getenv('EPOCHS_PHASE1', '30'))
EPOCHS_PHASE2 = int(os.getenv('EPOCHS', '60'))
EARLY_STOPPING_PATIENCE = int(os.getenv('ES_PATIENCE', '8'))
LEARNING_RATE = float(os.getenv('LEARNING_RATE', '0.0001'))
MODEL_VERSION = os.getenv('MODEL_VERSION', '1.1.0')
RANDOM_SEED = int(os.getenv('SEED', '42'))

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

SOURCE_DIRS = [
    Path(__file__).parent.parent / 'oil-bottle-frames',
    Path(__file__).parent.parent / 'oil-bottle-augmented',
    Path(__file__).parent.parent / 'augmented-output',
]

OUTPUT_DIR = Path(__file__).parent.parent / 'models' / 'fill-regressor' / f'v{MODEL_VERSION}'


# ── Label parsing ───────────────────────────────────────────────────────────────

def parse_label(dir_name: str) -> float | None:
    """Convert directory name to fill fraction (0.0–1.0). None = skip."""
    name = dir_name.strip().lower()
    if name == 'empty':
        return 0.0
    if name in ('1.5l_refs', '1500ml'):
        return 1.0
    if name.endswith('ml'):
        try:
            ml = int(name[:-2])
            if 0 < ml <= BOTTLE_CAPACITY_ML:
                return ml / BOTTLE_CAPACITY_ML
        except ValueError:
            pass
    return None


# ── Data collection ─────────────────────────────────────────────────────────────

def collect_samples() -> List[Tuple[str, float]]:
    """Walk all source dirs, return list of (image_path, fill_fraction)."""
    samples: List[Tuple[str, float]] = []
    skipped_dirs = set()

    for source_dir in SOURCE_DIRS:
        if not source_dir.exists():
            logger.warning(f"Source dir not found, skipping: {source_dir}")
            continue

        for subdir in sorted(source_dir.iterdir()):
            if not subdir.is_dir():
                continue
            label = parse_label(subdir.name)
            if label is None:
                skipped_dirs.add(subdir.name)
                continue
            for img_path in subdir.iterdir():
                if img_path.suffix.lower() in IMAGE_EXTENSIONS:
                    samples.append((str(img_path), label))

    if skipped_dirs:
        logger.info(f"Skipped unrecognised dirs: {sorted(skipped_dirs)}")

    return samples


def compute_sample_weights(samples: List[Tuple[str, float]]) -> List[float]:
    """Inverse-frequency weights per 10%-bucket to counter class imbalance."""
    buckets = [0] * 10
    for _, lbl in samples:
        buckets[min(int(lbl * 10), 9)] += 1
    total = len(samples)
    weights = []
    for _, lbl in samples:
        idx = min(int(lbl * 10), 9)
        # weight = total / (10 * bucket_count) — normalised so mean weight ≈ 1
        weights.append(total / (10 * max(buckets[idx], 1)))
    return weights


def log_label_distribution(samples: List[Tuple[str, float]]) -> None:
    labels_pct = [lbl * 100 for _, lbl in samples]
    buckets = [0] * 10  # 0-10%, 10-20%, ..., 90-100%
    for pct in labels_pct:
        idx = min(int(pct // 10), 9)
        buckets[idx] += 1
    logger.info("Fill % distribution:")
    for i, count in enumerate(buckets):
        bar = '█' * (count // max(1, max(buckets) // 40))
        logger.info(f"  {i*10:3d}-{(i+1)*10:3d}%  {count:5d}  {bar}")


# ── tf.data pipeline ────────────────────────────────────────────────────────────

def make_dataset(
    samples: List[Tuple[str, float]],
    augment: bool,
    batch_size: int,
    shuffle: bool = False,
    sample_weights: List[float] = None,
) -> tf.data.Dataset:
    paths = [s[0] for s in samples]
    labels = [s[1] for s in samples]

    if sample_weights is not None:
        ds = tf.data.Dataset.from_tensor_slices((paths, labels, sample_weights))
    else:
        ds = tf.data.Dataset.from_tensor_slices((paths, labels))

    if shuffle:
        ds = ds.shuffle(buffer_size=min(len(samples), 10_000), seed=RANDOM_SEED)

    def load(path, label, weight=None):
        raw = tf.io.read_file(path)
        img = tf.image.decode_image(raw, channels=3, expand_animations=False)
        img = tf.cast(img, tf.float32)
        img = tf.image.resize(img, IMG_SIZE)
        img = img / 255.0
        if weight is not None:
            return img, label, weight
        return img, label

    def load_with_weight(path, label, weight):
        return load(path, label, weight)

    def load_no_weight(path, label):
        return load(path, label)

    def augment_fn(img, label, weight=None):
        img = tf.image.random_flip_left_right(img)
        img = tf.image.random_brightness(img, max_delta=0.2)
        img = tf.image.random_contrast(img, lower=0.8, upper=1.2)
        img = tf.image.random_saturation(img, lower=0.8, upper=1.2)
        img = tf.clip_by_value(img, 0.0, 1.0)
        if weight is not None:
            return img, label, weight
        return img, label

    if sample_weights is not None:
        ds = ds.map(load_with_weight, num_parallel_calls=tf.data.AUTOTUNE)
        if augment:
            ds = ds.map(lambda i, l, w: augment_fn(i, l, w), num_parallel_calls=tf.data.AUTOTUNE)
    else:
        ds = ds.map(load_no_weight, num_parallel_calls=tf.data.AUTOTUNE)
        if augment:
            ds = ds.map(lambda i, l: augment_fn(i, l), num_parallel_calls=tf.data.AUTOTUNE)

    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return ds


# ── Training ────────────────────────────────────────────────────────────────────

def get_callbacks(phase: str) -> List[callbacks.Callback]:
    checkpoint_path = str(OUTPUT_DIR / f'checkpoint_{phase}.keras')
    return [
        callbacks.EarlyStopping(
            monitor='val_mae',
            patience=EARLY_STOPPING_PATIENCE,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor='val_mae',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
        callbacks.ModelCheckpoint(
            filepath=checkpoint_path,
            monitor='val_mae',
            save_best_only=True,
            verbose=0,
        ),
    ]


# ── Evaluation ──────────────────────────────────────────────────────────────────

def evaluate_on_dataset(
    model: keras.Model,
    ds: tf.data.Dataset,
    threshold: float = 0.10,
) -> Dict[str, float]:
    """Batch-wise evaluation — no full dataset in RAM."""
    all_preds = []
    all_labels = []

    for imgs, labels in ds:
        preds = model(imgs, training=False).numpy().flatten()
        all_preds.extend(preds.tolist())
        all_labels.extend(labels.numpy().tolist())

    y_pred = np.array(all_preds)
    y_true = np.array(all_labels)

    abs_err = np.abs(y_pred - y_true)
    mae = float(np.mean(abs_err) * 100)
    rmse = float(np.sqrt(np.mean((y_pred - y_true) ** 2)) * 100)
    accuracy = float(np.mean(abs_err <= threshold) * 100)
    median_ae = float(np.median(abs_err) * 100)
    max_error = float(np.max(abs_err) * 100)

    logger.info("=" * 60)
    logger.info("Test Set Evaluation")
    logger.info("=" * 60)
    logger.info(f"MAE:                    {mae:.2f}%")
    logger.info(f"RMSE:                   {rmse:.2f}%")
    logger.info(f"Accuracy (±10%):        {accuracy:.2f}%")
    logger.info(f"Median Absolute Error:  {median_ae:.2f}%")
    logger.info(f"Max Error:              {max_error:.2f}%")
    logger.info(f"Test Samples:           {len(y_true)}")
    logger.info("=" * 60)

    if mae <= 10.0:
        logger.info("✓ TARGET MET: MAE ≤ 10%")
    else:
        logger.warning(f"✗ TARGET NOT MET: MAE {mae:.2f}% > 10%")

    if accuracy >= 80.0:
        logger.info("✓ TARGET MET: Accuracy ≥ 80%")
    else:
        logger.warning(f"✗ TARGET NOT MET: Accuracy {accuracy:.2f}% < 80%")

    # Sample predictions
    indices = np.random.choice(len(y_true), size=min(10, len(y_true)), replace=False)
    logger.info("\nSample Predictions:")
    logger.info("-" * 60)
    for idx in indices:
        logger.info(
            f"  True={y_true[idx]*100:.1f}%  Pred={y_pred[idx]*100:.1f}%  "
            f"Err={abs_err[idx]*100:.1f}%"
        )

    return {
        'mae': mae,
        'rmse': rmse,
        'accuracy_within_10pct': accuracy,
        'median_ae': median_ae,
        'max_error': max_error,
        'num_samples': int(len(y_true)),
    }


# ── TF.js export ────────────────────────────────────────────────────────────────

def _stub_broken_windows_deps() -> None:
    """
    tensorflow_decision_forests ships Linux-only .so files.
    tensorflowjs imports it unconditionally, which crashes on Windows.
    Stub the module before tensorflowjs is imported so the import chain succeeds.
    """
    from unittest.mock import MagicMock
    broken = [
        'tensorflow_decision_forests',
        'tensorflow_decision_forests.keras',
        'tensorflow_decision_forests.keras.core',
        'tensorflow_decision_forests.tensorflow',
        'tensorflow_decision_forests.tensorflow.ops',
        'tensorflow_decision_forests.tensorflow.ops.inference',
        'tensorflow_decision_forests.tensorflow.ops.inference.api',
    ]
    for mod in broken:
        if mod not in sys.modules:
            sys.modules[mod] = MagicMock()


def export_to_tfjs(model: keras.Model, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    saved_model_path = output_dir / 'saved_model'
    tfjs_path = output_dir / 'tfjs_model'

    logger.info(f"Saving SavedModel to {saved_model_path}...")
    tf.saved_model.save(model, str(saved_model_path))

    logger.info("Converting to TF.js...")
    _stub_broken_windows_deps()

    try:
        import tensorflowjs as tfjs
        tfjs.converters.convert_tf_saved_model(
            str(saved_model_path),
            str(tfjs_path),
        )
    except Exception as e:
        logger.error(f"TF.js conversion failed: {e}")
        logger.warning("Model saved as SavedModel only. Convert manually:")
        logger.warning(f"  tensorflowjs_converter --input_format=tf_saved_model {saved_model_path} {tfjs_path}")
        return saved_model_path

    logger.info(f"✓ TF.js model at {tfjs_path}")
    return tfjs_path


# ── Main ────────────────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("Local Fill-Level Regressor Training")
    logger.info("=" * 60)
    logger.info(f"TensorFlow {tf.__version__}")
    logger.info(f"GPU: {[g.name for g in tf.config.list_physical_devices('GPU')] or 'None (CPU)'}")

    random.seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    tf.random.set_seed(RANDOM_SEED)

    # ── 1. Collect samples ──────────────────────────────────────────────────────
    logger.info("\nCollecting samples from source directories...")
    samples = collect_samples()

    if not samples:
        logger.error("No images found. Check SOURCE_DIRS.")
        sys.exit(1)

    logger.info(f"Total samples: {len(samples):,}")
    log_label_distribution(samples)

    # ── 2. Split ────────────────────────────────────────────────────────────────
    random.shuffle(samples)
    n = len(samples)
    n_train = int(n * 0.80)
    n_val = int(n * 0.90)

    train_samples = samples[:n_train]
    val_samples = samples[n_train:n_val]
    test_samples = samples[n_val:]

    logger.info(f"\nSplit — train: {len(train_samples):,}  val: {len(val_samples):,}  test: {len(test_samples):,}")

    # ── 3. Sample weights (balance buckets) ─────────────────────────────────────
    logger.info("\nComputing sample weights...")
    train_weights = compute_sample_weights(train_samples)
    w_min, w_max = min(train_weights), max(train_weights)
    logger.info(f"Weight range: {w_min:.3f} – {w_max:.3f}")

    # ── 4. Build datasets ───────────────────────────────────────────────────────
    train_ds = make_dataset(train_samples, augment=True, batch_size=BATCH_SIZE,
                            shuffle=True, sample_weights=train_weights)
    val_ds = make_dataset(val_samples, augment=False, batch_size=BATCH_SIZE)
    test_ds = make_dataset(test_samples, augment=False, batch_size=BATCH_SIZE)

    # ── 5. Build model ──────────────────────────────────────────────────────────
    logger.info("\nBuilding model...")
    # Start with top-50 backbone layers unfrozen — ImageNet features don't
    # transfer well to fill-level regression; need real fine-tuning from epoch 1.
    model = build_fill_regressor(input_shape=(*IMG_SIZE, 3), freeze_backbone=True)
    model = unfreeze_top_layers(model, num_layers=50)
    model = compile_model(model, LEARNING_RATE)
    model.summary(print_fn=logger.info)

    # ── 6. Phase 1 — partial backbone + head ────────────────────────────────────
    logger.info(f"\n{'='*60}")
    logger.info(f"Phase 1: top-50 layers + head, LR={LEARNING_RATE} ({EPOCHS_PHASE1} epochs max)")
    logger.info(f"{'='*60}")

    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_PHASE1,
        callbacks=get_callbacks('phase1'),
        verbose=1,
    )

    # ── 7. Phase 2 — full backbone fine-tune ────────────────────────────────────
    logger.info(f"\n{'='*60}")
    logger.info(f"Phase 2: all layers, LR={LEARNING_RATE/10} ({EPOCHS_PHASE2} epochs max)")
    logger.info(f"{'='*60}")

    model = unfreeze_top_layers(model, num_layers=999)  # unfreeze all
    model = compile_model(model, LEARNING_RATE / 10)    # 1e-5

    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_PHASE2,
        callbacks=get_callbacks('phase2'),
        verbose=1,
    )

    # ── 7. Evaluate ─────────────────────────────────────────────────────────────
    logger.info("\nEvaluating on test set...")
    metrics = evaluate_on_dataset(model, test_ds, threshold=0.10)

    # ── 8. Export TF.js ─────────────────────────────────────────────────────────
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    tfjs_path = export_to_tfjs(model, OUTPUT_DIR)

    # ── 9. Save training metadata ───────────────────────────────────────────────
    metadata = {
        'version': MODEL_VERSION,
        'trained_at': datetime.utcnow().isoformat(),
        'architecture': 'MobileNetV3-Small',
        'bottle_capacity_ml': BOTTLE_CAPACITY_ML,
        'img_size': list(IMG_SIZE),
        'training_samples': len(train_samples),
        'val_samples': len(val_samples),
        'test_samples': len(test_samples),
        'source_dirs': [str(d) for d in SOURCE_DIRS],
        'metrics': metrics,
        'config': {
            'batch_size': BATCH_SIZE,
            'epochs_phase1': EPOCHS_PHASE1,
            'epochs_phase2': EPOCHS_PHASE2,
            'learning_rate': LEARNING_RATE,
            'seed': RANDOM_SEED,
        },
        'history': {
            'phase1': {k: [float(v) for v in vs] for k, vs in history1.history.items()},
            'phase2': {k: [float(v) for v in vs] for k, vs in history2.history.items()},
        },
    }

    meta_path = OUTPUT_DIR / 'training_metadata.json'
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"✓ Metadata saved to {meta_path}")

    # ── 10. Summary ─────────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 60)
    logger.info("✓ Training complete")
    logger.info("=" * 60)
    logger.info(f"Version:        {MODEL_VERSION}")
    logger.info(f"MAE:            {metrics['mae']:.2f}%")
    logger.info(f"Accuracy ±10%:  {metrics['accuracy_within_10pct']:.2f}%")
    logger.info(f"TF.js model:    {tfjs_path}")
    logger.info(f"Metadata:       {meta_path}")
    logger.info("=" * 60)

    if metrics['mae'] > 10.0:
        logger.warning("MAE above 10% target — consider more epochs or data")
        sys.exit(1)


if __name__ == '__main__':
    main()
