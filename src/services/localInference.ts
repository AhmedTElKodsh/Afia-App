/**
 * Local Inference Service
 * Handles on-device fill-level prediction using TF.js CNN
 * Story 7.4 - Task 7: Performance optimization with metrics logging
 * Story 7.4 - Task 8: Added error telemetry
 */
import * as tf from '@tensorflow/tfjs';
import { getModel, getLoadedModelVersion, beginInference, endInference } from './modelLoader';
import { logError } from './errorTelemetry';

const INFERENCE_CONFIG = {
  imageSize: 224,
  normalization: {
    mean: [0.485, 0.456, 0.406], // ImageNet mean
    std: [0.229, 0.224, 0.225],  // ImageNet std
  },
  confidenceThreshold: 0.75,
  baseConfidence: 0.85, // MobileNetV3-Small baseline
};

// Story 7.4 - Task 7: Performance metrics tracking
interface PerformanceMetrics {
  preprocessingMs: number;
  inferenceMs: number;
  postprocessingMs: number;
  totalMs: number;
  backend: string;
}

const performanceHistory: PerformanceMetrics[] = [];
const MAX_HISTORY = 50;

/**
 * Log performance metrics for monitoring
 */
function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  performanceHistory.push(metrics);
  if (performanceHistory.length > MAX_HISTORY) {
    performanceHistory.shift();
  }
  
  // Calculate averages
  const avg = {
    preprocessing: performanceHistory.reduce((sum, m) => sum + m.preprocessingMs, 0) / performanceHistory.length,
    inference: performanceHistory.reduce((sum, m) => sum + m.inferenceMs, 0) / performanceHistory.length,
    postprocessing: performanceHistory.reduce((sum, m) => sum + m.postprocessingMs, 0) / performanceHistory.length,
    total: performanceHistory.reduce((sum, m) => sum + m.totalMs, 0) / performanceHistory.length,
  };
  
  console.log('[LocalInference] Performance:', {
    current: metrics,
    averages: {
      preprocessing: Math.round(avg.preprocessing),
      inference: Math.round(avg.inference),
      postprocessing: Math.round(avg.postprocessing),
      total: Math.round(avg.total),
    },
    backend: metrics.backend,
    sampleSize: performanceHistory.length,
  });
  
  // Warn if performance is below target (< 50ms inference)
  if (metrics.inferenceMs > 50) {
    console.warn('[LocalInference] Inference slower than target (50ms):', metrics.inferenceMs);
  }
  
  // Warn if total time exceeds target (< 650ms total)
  if (metrics.totalMs > 650) {
    console.warn('[LocalInference] Total time exceeds target (650ms):', metrics.totalMs);
  }
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  if (performanceHistory.length === 0) {
    return null;
  }
  
  const avg = {
    preprocessing: performanceHistory.reduce((sum, m) => sum + m.preprocessingMs, 0) / performanceHistory.length,
    inference: performanceHistory.reduce((sum, m) => sum + m.inferenceMs, 0) / performanceHistory.length,
    postprocessing: performanceHistory.reduce((sum, m) => sum + m.postprocessingMs, 0) / performanceHistory.length,
    total: performanceHistory.reduce((sum, m) => sum + m.totalMs, 0) / performanceHistory.length,
  };
  
  return {
    averages: {
      preprocessing: Math.round(avg.preprocessing),
      inference: Math.round(avg.inference),
      postprocessing: Math.round(avg.postprocessing),
      total: Math.round(avg.total),
    },
    backend: tf.getBackend(),
    sampleSize: performanceHistory.length,
  };
}

interface ImageQuality {
  blurScore: number;
  brightnessScore: number;
}

interface LocalInferenceResult {
  fillPercentage: number;
  confidence: number;
  inferenceTimeMs: number;
  modelVersion: string;
}

/**
 * Decode a base64 image string into an HTMLImageElement once.
 * Both preprocessing and quality assessment share this element to avoid double-decoding.
 */
function loadImageElement(imageBase64: string, timeoutMs = 10000): Promise<HTMLImageElement> {
  if (!imageBase64 || imageBase64.trim() === '') {
    return Promise.reject(new Error('Invalid image data: empty or null'));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('Image load timeout')); }
    }, timeoutMs);
    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error('Failed to load image: invalid or corrupted image data'));
    };
    img.src = imageBase64;
  });
}

/**
 * Convert a pre-loaded HTMLImageElement to a 4D TF.js tensor [1, 224, 224, 3].
 * Caller owns the returned tensor and must dispose it.
 * Intermediate tensors are cleaned up on both success and error.
 */
function preprocessImageElement(img: HTMLImageElement): tf.Tensor4D {
  let tensor: tf.Tensor3D | null = null;
  let resized: tf.Tensor3D | null = null;
  let normalized: tf.Tensor | null = null;
  try {
    tensor = tf.browser.fromPixels(img);
    resized = tf.image.resizeBilinear(tensor, [
      INFERENCE_CONFIG.imageSize,
      INFERENCE_CONFIG.imageSize,
    ]);
    normalized = tf.tidy(() => {
      const { mean, std } = INFERENCE_CONFIG.normalization;
      const float = resized!.toFloat().div(255.0);
      return float.sub(tf.tensor1d(mean)).div(tf.tensor1d(std));
    });
    return normalized.expandDims(0) as tf.Tensor4D;
  } finally {
    tensor?.dispose();
    resized?.dispose();
    normalized?.dispose();
  }
}

/**
 * Assess image quality from a pre-decoded image element.
 * blurScore convention matches uploadFilter.ts: sharp → 1.0, blurry → 0.0.
 */
function assessImageQualityFromElement(img: HTMLImageElement): ImageQuality {
  const SIZE = 100;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blurScore: 0.5, brightnessScore: 0.5 };

  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data, width, height } = ctx.getImageData(0, 0, SIZE, SIZE);

  // Brightness
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const brightnessScore = totalBrightness / (data.length / 4) / 255;

  // Laplacian-based sharpness (matches uploadFilter.ts calculateBlurScore convention)
  // sharp → high score (up to 1.0), blurry → low score (near 0)
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  let lapVariance = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        -gray[idx - width - 1] - gray[idx - width] - gray[idx - width + 1]
        - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
        - gray[idx + width - 1] - gray[idx + width] - gray[idx + width + 1];
      lapVariance += lap * lap;
      count++;
    }
  }
  const blurScore = Math.min(1.0, lapVariance / count / 100);

  return { blurScore, brightnessScore };
}

/**
 * Calculate confidence score based on prediction and image quality
 */
function calculateConfidence(
  prediction: number,
  imageQuality: ImageQuality
): number {
  let confidence = INFERENCE_CONFIG.baseConfidence;
  
  // Reduce confidence for edge cases (boundary values)
  if (prediction < 0.05 || prediction > 0.95) {
    confidence -= 0.15;
  }
  
  // Reduce confidence for poor image quality (blurScore: sharp=1.0, blurry=0.0)
  if (imageQuality.blurScore < 0.4) {
    confidence -= 0.20;
  }
  if (imageQuality.brightnessScore < 0.4 || imageQuality.brightnessScore > 0.9) {
    confidence -= 0.10;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Run local inference on image
 * Story 7.4 - Task 7: Added performance metrics tracking
 * Story 7.4 - Task 8: Added comprehensive error handling with tensor cleanup
 */
export async function runLocalInference(
  imageBase64: string
): Promise<LocalInferenceResult> {
  const startTime = performance.now();
  let inputTensor: tf.Tensor4D | null = null;
  let prediction: tf.Tensor | null = null;
  const modelVersion = getLoadedModelVersion();

  beginInference();
  try {
    const model = getModel();

    // Decode once — share element between preprocessing and quality assessment
    const img = await loadImageElement(imageBase64);
    const preprocessStart = performance.now();

    inputTensor = preprocessImageElement(img);
    const preprocessEndTime = performance.now();

    prediction = model.predict(inputTensor) as tf.Tensor;
    const fillPercentage = (await prediction.data())[0];
    const inferenceEndTime = performance.now();

    const imageQuality = assessImageQualityFromElement(img);
    const confidence = calculateConfidence(fillPercentage, imageQuality);

    const endTime = performance.now();
    const inferenceTimeMs = Math.round(endTime - startTime);

    logPerformanceMetrics({
      preprocessingMs: Math.round(preprocessEndTime - preprocessStart),
      inferenceMs: Math.round(inferenceEndTime - preprocessEndTime),
      postprocessingMs: Math.round(endTime - inferenceEndTime),
      totalMs: inferenceTimeMs,
      backend: tf.getBackend(),
    });

    return {
      fillPercentage: fillPercentage * 100,
      confidence,
      inferenceTimeMs,
      modelVersion,
    };
  } catch (error) {
    console.error('[LocalInference] Inference failed:', error);
    logError('inference', error as Error, { modelVersion, backend: tf.getBackend() });
    throw error;
  } finally {
    endInference();
    inputTensor?.dispose();
    prediction?.dispose();
  }
}

/**
 * Check if confidence meets threshold for local-only result
 */
export function isHighConfidence(confidence: number): boolean {
  return confidence >= INFERENCE_CONFIG.confidenceThreshold;
}
