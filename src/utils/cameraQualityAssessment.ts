/**
 * Camera Quality Assessment Utilities
 * 
 * Real-time image quality analysis for live camera guidance.
 * Implements blur detection, lighting assessment, and composition analysis.
 * 
 * Based on research from:
 * - ExposureNet: Mobile camera exposure parameters autonomous control
 * - Image Quality Assessment (Laplacian standard deviation method)
 * - MediaPipe pose detection for angle guidance
 */

/**
 * Image quality assessment results
 */
export interface QualityAssessment {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Blur detection score (0-100, higher = sharper) */
  blurScore: number;
  /** Lighting quality assessment */
  lighting: LightingAssessment;
  /** Composition assessment */
  composition: CompositionAssessment;
  /** Is image good quality for capture? */
  isGoodQuality: boolean;
  /** Guidance message for user */
  guidanceMessage: string;
  /** Guidance type for UI styling */
  guidanceType: 'success' | 'warning' | 'error';
}

/**
 * Lighting assessment results
 */
export interface LightingAssessment {
  /** Average brightness (0-255) */
  brightness: number;
  /** Contrast score (0-100) */
  contrast: number;
  /** Lighting quality status */
  status: 'too-dark' | 'too-bright' | 'low-contrast' | 'good';
  /** Is lighting acceptable? */
  isAcceptable: boolean;
}

/**
 * Composition assessment results
 */
export interface CompositionAssessment {
  /** Is subject centered? (x-axis) */
  isCentered: boolean;
  /** Is camera level? */
  isLevel: boolean;
  /**
   * Distance / presence status.
   * 'not-detected' = no bottle found in centre region → block capture, outline red.
   * 'too-far'      = bottle visible but smaller than guide → outline yellow.
   * 'too-close'    = bottle larger than guide → outline yellow.
   * 'good'         = bottle fills the guide → outline green.
   */
  distance: 'too-close' | 'too-far' | 'good' | 'not-detected';
  /** Subject visibility percentage (apparent width as % of frame) */
  visibility: number;
  /** True when a foreground object is detected inside the guide region */
  bottleDetected: boolean;
}

/**
 * Canvas element for image processing (reused for performance)
 */
let processingCanvas: HTMLCanvasElement | null = null;
let processingContext: CanvasRenderingContext2D | null = null;

/**
 * Get or create processing canvas for image analysis.
 * Recreates both canvas and context if the context has been invalidated
 * (e.g. the browser reclaimed GPU resources while the tab was backgrounded).
 */
function getProcessingCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  // Detect stale context: recreate if the context's canvas reference no longer matches.
  if (processingContext && processingContext.canvas !== processingCanvas) {
    processingCanvas = null;
    processingContext = null;
  }

  if (!processingCanvas || !processingContext) {
    processingCanvas = document.createElement('canvas');
    processingContext = processingCanvas.getContext('2d', { willReadFrequently: true });

    if (!processingContext) {
      throw new Error('Unable to create canvas context for image analysis');
    }
  }
  return { canvas: processingCanvas, ctx: processingContext };
}

/**
 * Convert image data to grayscale
 * Uses luminance method: Y = 0.299R + 0.587G + 0.114B
 */
function toGrayscale(imageData: ImageData): Uint8ClampedArray {
  const data = imageData.data;
  const gray = new Uint8ClampedArray(data.length / 4);
  
  for (let i = 0; i < data.length; i += 4) {
    // Luminance method for grayscale conversion
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  
  return gray;
}

/**
 * Apply Laplacian filter for edge detection
 * Kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
 */
function applyLaplacianFilter(grayData: Uint8ClampedArray, width: number, height: number): Float32Array {
  const result = new Float32Array(grayData.length);
  
  // Laplacian kernel
  const kernel = [0, -1, 0, -1, 4, -1, 0, -1, 0];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let kernelIndex = 0;
      
      // Apply convolution
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx));
          sum += grayData[pixelIndex] * kernel[kernelIndex];
          kernelIndex++;
        }
      }
      
      result[y * width + x] = sum;
    }
  }
  
  return result;
}

/**
 * Calculate standard deviation of Laplacian response
 * Higher std-dev = sharper image (more edges)
 */
function calculateStdDev(data: Float32Array): number {
  const n = data.length;
  let sum = 0;
  
  // Calculate mean
  for (let i = 0; i < n; i++) {
    sum += Math.abs(data[i]);
  }
  const mean = sum / n;
  
  // Calculate variance
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const diff = Math.abs(data[i]) - mean;
    variance += diff * diff;
  }
  
  return Math.sqrt(variance / n);
}

/**
 * Detect blur using Laplacian standard deviation method
 * 
 * @param imageSource - Image, Video, or Canvas element
 * @returns Blur score (0-100, higher = sharper)
 */
export function detectBlur(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): number {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    
    // Downscale for performance (100x100 is sufficient for blur detection)
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    
    // Draw and get image data
    ctx.drawImage(imageSource, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Convert to grayscale
    const grayData = toGrayscale(imageData);
    
    // Apply Laplacian filter
    const laplacian = applyLaplacianFilter(grayData, size, size);
    
    // Calculate std-dev of Laplacian response (higher = sharper)
    const stdDev = calculateStdDev(laplacian);

    // Normalize to 0-100 scale.
    // Typical std-dev ranges on a 100×100 downscaled image:
    //   0–15  → blurry, 15–50 → acceptable, 50+ → sharp
    // Scaling ×2 maps the useful 0–50 range onto 0–100.
    const normalizedScore = Math.min(100, Math.max(0, stdDev * 2));
    
    return normalizedScore;
  } catch (error) {
    console.error('Blur detection error:', error);
    return 50; // Return neutral score on error
  }
}

/**
 * Calculate average brightness of image
 */
function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let total = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // Use luminance formula
    const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    total += luminance;
  }
  
  return total / (data.length / 4);
}

/**
 * Calculate image contrast using RMS contrast
 */
function calculateContrast(grayData: Uint8ClampedArray): number {
  const n = grayData.length;
  let sum = 0;
  let sumSquared = 0;
  
  // Calculate mean
  for (let i = 0; i < n; i++) {
    sum += grayData[i];
    sumSquared += grayData[i] * grayData[i];
  }
  
  const mean = sum / n;
  const rms = Math.sqrt(sumSquared / n);
  
  // RMS contrast (normalized to 0-100)
  const contrast = rms / mean;
  return Math.min(100, Math.max(0, contrast * 200));
}

/**
 * Assess lighting quality
 * 
 * @param imageSource - Image, Video, or Canvas element
 * @returns Lighting assessment
 */
export function assessLighting(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): LightingAssessment {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    
    // Downscale for performance
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    
    ctx.drawImage(imageSource, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const grayData = toGrayscale(imageData);
    
    const brightness = calculateBrightness(imageData);
    const contrast = calculateContrast(grayData);
    
    // Determine lighting status
    let status: 'too-dark' | 'too-bright' | 'low-contrast' | 'good' = 'good';
    let isAcceptable = true;
    
    if (brightness < 40) {
      status = 'too-dark';
      isAcceptable = false;
    } else if (brightness > 220) {
      status = 'too-bright';
      isAcceptable = false;
    } else if (contrast < 30) {
      status = 'low-contrast';
      isAcceptable = false;
    }
    
    return {
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      status,
      isAcceptable,
    };
  } catch (error) {
    console.error('Lighting assessment error:', error);
    return {
      brightness: 128,
      contrast: 50,
      status: 'good',
      isAcceptable: true,
    };
  }
}

/**
 * Detect the Afia corn oil bottle using HSV colour segmentation.
 *
 * The Afia 1.5L bottle has two reliable colour signatures that survive most
 * lighting conditions:
 *   • Green label  — H 80–170°, S ≥ 25 %, V ≥ 20 %
 *   • Amber/golden oil inside — H 25–65°, S ≥ 30 %, V ≥ 40 %
 *
 * We sample only the centre 60 % of the frame horizontally (where the overlay
 * sits) so background objects at the edges are ignored.
 *
 * Outputs:
 *   bottleDetected — true when enough matching pixels are found
 *   distance       — based on the vertical span of the matched region vs. the
 *                    expected span at optimal distance (≈ 65 % of crop height)
 */
export function analyzeComposition(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): CompositionAssessment {
  try {
    const { canvas, ctx } = getProcessingCanvas();

    // Small portrait crop — centre 60 % of width, full height
    const W = 60;
    const H = 100;
    canvas.width = W;
    canvas.height = H;

    // Draw only the horizontal centre of the source into our canvas
    const srcEl = imageSource as HTMLVideoElement;
    const srcW = srcEl.videoWidth || (imageSource as HTMLImageElement).naturalWidth || W;
    const srcH = srcEl.videoHeight || (imageSource as HTMLImageElement).naturalHeight || H;
    const cropX = srcW * 0.20;
    const cropW = srcW * 0.60;
    ctx.drawImage(imageSource, cropX, 0, cropW, srcH, 0, 0, W, H);

    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    let minRow = H;
    let maxRow = -1;
    let matchCount = 0;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // RGB → HSV
        const rN = r / 255, gN = g / 255, bN = b / 255;
        const max = Math.max(rN, gN, bN);
        const min = Math.min(rN, gN, bN);
        const delta = max - min;
        const v = max;
        const s = max > 0 ? delta / max : 0;
        let h = 0;
        if (delta > 0) {
          if (max === rN)      h = ((gN - bN) / delta % 6) * 60;
          else if (max === gN) h = ((bN - rN) / delta + 2) * 60;
          else                 h = ((rN - gN) / delta + 4) * 60;
          if (h < 0) h += 360;
        }

        // Afia green label: H 80–170°, S ≥ 25 %, V ≥ 18 %
        const isGreen = h >= 80 && h <= 170 && s >= 0.25 && v >= 0.18;
        // Amber/golden oil: H 25–65°, S ≥ 28 %, V ≥ 38 %
        const isAmber = h >= 25 && h <= 65 && s >= 0.28 && v >= 0.38;

        if (isGreen || isAmber) {
          matchCount++;
          if (y < minRow) minRow = y;
          if (y > maxRow) maxRow = y;
        }
      }
    }

    const matchRatio = matchCount / (W * H);
    const bottleDetected = matchRatio >= 0.04 && maxRow > minRow;

    if (!bottleDetected) {
      return {
        isCentered: false,
        isLevel: true,
        distance: 'not-detected',
        visibility: 0,
        bottleDetected: false,
      };
    }

    // Vertical span of matched pixels relative to crop height
    const spanFraction = (maxRow - minRow) / H;

    // At optimal distance the bottle should fill ≈ 65 % of the crop height.
    // Under 45 % → too far; over 90 % → too close.
    let distance: 'too-close' | 'too-far' | 'good' | 'not-detected';
    if (spanFraction < 0.30) {
      distance = 'not-detected'; // too small to be confident
    } else if (spanFraction < 0.45) {
      distance = 'too-far';
    } else if (spanFraction > 0.90) {
      distance = 'too-close';
    } else {
      distance = 'good';
    }

    return {
      isCentered: true,
      isLevel: true,
      distance,
      visibility: Math.round(spanFraction * 100),
      bottleDetected: distance !== 'not-detected',
    };
  } catch (error) {
    console.error('Composition analysis error:', error);
    return {
      isCentered: false,
      isLevel: true,
      distance: 'not-detected',
      visibility: 0,
      bottleDetected: false,
    };
  }
}

/**
 * Generate guidance message based on quality assessment.
 * Priority: bottle alignment > lighting > blur — composition is checked first
 * because it's the most common issue on mobile.
 */
function generateGuidanceMessage(
  blurScore: number,
  lighting: LightingAssessment,
  composition: CompositionAssessment
): { message: string; type: 'success' | 'warning' | 'error' } {
  // Bottle position / presence (highest priority)
  if (!composition.bottleDetected || composition.distance === 'not-detected') {
    return {
      message: 'Point camera at the bottle',
      type: 'error',
    };
  }

  if (composition.distance === 'too-far') {
    return {
      message: 'Move closer to the bottle',
      type: 'warning',
    };
  }

  if (composition.distance === 'too-close') {
    return {
      message: 'Move camera back slightly',
      type: 'warning',
    };
  }

  // Lighting
  if (lighting.status === 'too-dark') {
    return {
      message: 'Move to a brighter location',
      type: 'error',
    };
  }

  if (lighting.status === 'too-bright') {
    return {
      message: 'Reduce glare — avoid direct light',
      type: 'warning',
    };
  }

  if (lighting.status === 'low-contrast') {
    return {
      message: 'Improve lighting contrast',
      type: 'warning',
    };
  }

  // Blur
  if (blurScore < 30) {
    return {
      message: 'Hold steady — image is blurry',
      type: 'error',
    };
  }

  if (blurScore < 45) {
    return {
      message: 'Hold still…',
      type: 'warning',
    };
  }

  return {
    message: 'Perfect! Hold steady…',
    type: 'success',
  };
}

/**
 * Complete quality assessment
 * 
 * @param imageSource - Image, Video, or Canvas element
 * @param options - Assessment options
 * @returns Complete quality assessment
 */
export function assessImageQuality(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options: {
    minBlurScore?: number;
    requireGoodLighting?: boolean;
  } = {}
): QualityAssessment {
  const {
    minBlurScore = 50,
    requireGoodLighting = true,
  } = options;
  
  // Run all assessments
  const blurScore = detectBlur(imageSource);
  const lighting = assessLighting(imageSource);
  const composition = analyzeComposition(imageSource);
  
  // Composition contributes 40 % so a missing/misaligned bottle visibly drops
  // the overall score and prevents the "Ready" state.
  const compositionScore =
    composition.distance === 'good'          ? 100 :
    composition.distance === 'too-far' ||
    composition.distance === 'too-close'     ?  40 : 0;

  const overallScore = Math.round(
    blurScore * 0.4 +
    (lighting.isAcceptable ? 100 : 50) * 0.2 +
    compositionScore * 0.4
  );

  // Bottle must be detected AND at the right distance before capture is allowed.
  const isGoodQuality =
    blurScore >= minBlurScore &&
    (!requireGoodLighting || lighting.isAcceptable) &&
    composition.bottleDetected &&
    composition.distance === 'good';
  
  // Generate guidance message
  const { message: guidanceMessage, type: guidanceType } = generateGuidanceMessage(
    blurScore,
    lighting,
    composition
  );
  
  return {
    overallScore,
    blurScore: Math.round(blurScore),
    lighting,
    composition,
    isGoodQuality,
    guidanceMessage,
    guidanceType,
  };
}

/**
 * Debounced quality assessment for performance
 * Calls the assessment function at most once per interval
 */
export function createDebouncedAssessment(
  callback: (assessment: QualityAssessment) => void,
  intervalMs: number = 500
) {
  let lastCall = 0;
  let timeoutId: number | null = null;
  
  return {
    processFrame(video: HTMLVideoElement) {
      const now = Date.now();
      
      if (now - lastCall >= intervalMs) {
        // Process immediately
        lastCall = now;
        const assessment = assessImageQuality(video);
        callback(assessment);
      } else if (!timeoutId) {
        // Schedule for later
        timeoutId = window.setTimeout(() => {
          timeoutId = null;
          lastCall = Date.now();
          const assessment = assessImageQuality(video);
          callback(assessment);
        }, intervalMs - (now - lastCall));
      }
    },
    
    cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}

/**
 * Export for testing
 */
export const _testUtils = {
  toGrayscale,
  applyLaplacianFilter,
  calculateStdDev,
  calculateBrightness,
  calculateContrast,
  generateGuidanceMessage,
};
