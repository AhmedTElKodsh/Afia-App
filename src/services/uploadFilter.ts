/**
 * Upload Quality Filter
 * Story 7.8 - Service Worker Smart Upload Filtering
 * 
 * Pre-flight quality check before sending images to Worker /analyze endpoint.
 * Evaluates blur, brightness, and bottle detection confidence to warn users
 * about images likely to produce poor results.
 */

export const QUALITY_THRESHOLDS = {
  BLUR_MIN: 0.4,           // Below this → warn (blurry)
  BRIGHTNESS_MIN: 0.2,     // Below this → warn (too dark)
  BRIGHTNESS_MAX: 0.95,    // Above this → warn (overexposed)
  BOTTLE_CONF_MIN: 0.5,    // Below this → warn (bottle not clearly detected)
} as const;

export interface ImageQualitySignals {
  blurScore: number;                      // 0.0–1.0 (1.0 = sharp)
  brightnessScore: number;                // 0.0–1.0
  bottleDetectionConfidence: number | null; // null if detector not run
}

export interface QualityCheckResult {
  shouldWarn: boolean;
  reasons: string[];
}

/**
 * Check if an image meets quality thresholds for upload
 * 
 * @param signals - Quality metrics from image analysis
 * @returns Result indicating whether to warn user and reasons
 */
export function checkUploadQuality(signals: ImageQualitySignals): QualityCheckResult {
  const reasons: string[] = [];

  if (signals.blurScore < QUALITY_THRESHOLDS.BLUR_MIN) {
    reasons.push("uploadQuality.reasons.blur");
  }
  
  if (signals.brightnessScore < QUALITY_THRESHOLDS.BRIGHTNESS_MIN) {
    reasons.push("uploadQuality.reasons.tooDark");
  }
  
  if (signals.brightnessScore > QUALITY_THRESHOLDS.BRIGHTNESS_MAX) {
    reasons.push("uploadQuality.reasons.tooBright");
  }
  
  if (
    signals.bottleDetectionConfidence !== null &&
    signals.bottleDetectionConfidence < QUALITY_THRESHOLDS.BOTTLE_CONF_MIN
  ) {
    reasons.push("uploadQuality.reasons.noBottle");
  }

  return { 
    shouldWarn: reasons.length > 0, 
    reasons 
  };
}

/**
 * Calculate blur score using Laplacian variance
 * Higher values = sharper image
 * 
 * @param imageData - Canvas ImageData object
 * @returns Blur score (0.0-1.0, normalized)
 */
export function calculateBlurScore(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  
  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  // Calculate Laplacian variance
  let variance = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian = 
        -gray[idx - width - 1] - gray[idx - width] - gray[idx - width + 1] +
        -gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] +
        -gray[idx + width - 1] - gray[idx + width] - gray[idx + width + 1];
      
      variance += laplacian * laplacian;
      count++;
    }
  }
  
  const rawVariance = variance / count;
  
  // Normalize to 0-1 range (empirical threshold: 100 = sharp, 10 = blurry)
  // Using sigmoid-like normalization
  return Math.min(1.0, rawVariance / 100);
}

/**
 * Calculate brightness score from image data
 * 
 * @param imageData - Canvas ImageData object
 * @returns Brightness score (0.0-1.0)
 */
export function calculateBrightnessScore(imageData: ImageData): number {
  const { data } = imageData;
  let sum = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // Calculate luminance using standard formula
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += luminance;
  }
  
  const avgLuminance = sum / (data.length / 4);
  
  // Normalize to 0-1 range
  return avgLuminance / 255;
}

/**
 * Analyze image quality from a base64 data URL
 * 
 * @param imageBase64 - Base64 encoded image data URL
 * @returns Promise resolving to quality signals
 */
export function analyzeImageQuality(imageBase64: string): Promise<Omit<ImageQualitySignals, 'bottleDetectionConfidence'>> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onerror = () => reject(new Error('Failed to load image for quality analysis'));

    img.onload = () => {
      // Yield to the main thread before heavy canvas work to avoid jank
      const compute = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Downsample to 320px for speed — sufficient for quality signals
        const maxSize = 320;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const blurScore = calculateBlurScore(imageData);
        const brightnessScore = calculateBrightnessScore(imageData);

        resolve({ blurScore, brightnessScore });
      };

      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => compute(), { timeout: 2000 });
      } else {
        setTimeout(compute, 0);
      }
    };

    img.src = imageBase64;
  });
}
