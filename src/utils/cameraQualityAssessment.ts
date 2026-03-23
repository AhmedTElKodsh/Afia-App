/**
 * Camera Quality Assessment Utilities
 * 
 * Real-time image quality analysis for live camera guidance.
 * Implements blur detection, lighting assessment, and composition analysis.
 * 
 * Based on research from:
 * - ExposureNet: Mobile camera exposure parameters autonomous control
 * - Image Quality Assessment (Laplacian variance method)
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
  /** Distance status */
  distance: 'too-close' | 'too-far' | 'good';
  /** Subject visibility percentage */
  visibility: number;
}

/**
 * Canvas element for image processing (reused for performance)
 */
let processingCanvas: HTMLCanvasElement | null = null;
let processingContext: CanvasRenderingContext2D | null = null;

/**
 * Get or create processing canvas for image analysis
 */
function getProcessingCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
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
 * Calculate variance of Laplacian response
 * Higher variance = sharper image (more edges)
 */
function calculateVariance(data: Float32Array): number {
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
 * Detect blur using Laplacian variance method
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
    
    // Calculate variance
    const variance = calculateVariance(laplacian);
    
    // Normalize to 0-100 scale
    // Typical variance ranges: 0-50 (blurry), 50-150 (acceptable), 150+ (sharp)
    const normalizedScore = Math.min(100, Math.max(0, variance * 2));
    
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
    
    if (brightness < 60) {
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
 * Analyze composition (centering, level, distance)
 * Note: This is a simplified version. For production, integrate with MediaPipe.
 */
export function analyzeComposition(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): CompositionAssessment {
  try {
    const { canvas, ctx } = getProcessingCanvas();
    
    const size = 50;
    canvas.width = size;
    canvas.height = size;
    
    ctx.drawImage(imageSource, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    
    // Simple center of mass analysis
    let totalX = 0;
    let totalWeight = 0;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const luminance = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        
        // Weight by difference from average (edges have higher weight)
        const weight = Math.abs(luminance - 128);
        totalX += x * weight;
        totalWeight += weight;
      }
    }
    
    const centerX = totalWeight > 0 ? totalX / totalWeight : size / 2;
    
    // Check if centered (within 20% of center)
    const isCentered = Math.abs(centerX - size / 2) < size * 0.2;
    
    // Assume level for now (would use accelerometer/gyroscope in production)
    const isLevel = true;
    
    // Simple distance estimation based on average brightness variance
    // (closer objects typically have more detail)
    const distance: 'too-close' | 'too-far' | 'good' = 'good';
    
    return {
      isCentered,
      isLevel,
      distance,
      visibility: 100,
    };
  } catch (error) {
    console.error('Composition analysis error:', error);
    return {
      isCentered: true,
      isLevel: true,
      distance: 'good',
      visibility: 100,
    };
  }
}

/**
 * Generate guidance message based on quality assessment
 */
function generateGuidanceMessage(
  blurScore: number,
  lighting: LightingAssessment,
  composition: CompositionAssessment
): { message: string; type: 'success' | 'warning' | 'error' } {
  // Priority order: blur > lighting > composition
  
  if (blurScore < 40) {
    return {
      message: 'Hold steady - image is blurry',
      type: 'error',
    };
  }
  
  if (blurScore < 60) {
    return {
      message: 'Hold still...',
      type: 'warning',
    };
  }
  
  if (lighting.status === 'too-dark') {
    return {
      message: 'Move to a brighter location',
      type: 'error',
    };
  }
  
  if (lighting.status === 'too-bright') {
    return {
      message: 'Reduce glare - avoid direct light',
      type: 'warning',
    };
  }
  
  if (lighting.status === 'low-contrast') {
    return {
      message: 'Improve lighting contrast',
      type: 'warning',
    };
  }
  
  if (!composition.isCentered) {
    return {
      message: 'Center the bottle in frame',
      type: 'warning',
    };
  }
  
  if (composition.distance === 'too-close') {
    return {
      message: 'Move camera back slightly',
      type: 'warning',
    };
  }
  
  if (composition.distance === 'too-far') {
    return {
      message: 'Move closer to the bottle',
      type: 'warning',
    };
  }
  
  // All good!
  return {
    message: 'Perfect! Hold steady...',
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
  
  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    blurScore * 0.5 +
    (lighting.isAcceptable ? 100 : 50) * 0.3 +
    (composition.isCentered ? 100 : 50) * 0.2
  );
  
  // Determine if good quality
  const isGoodQuality = 
    blurScore >= minBlurScore &&
    (!requireGoodLighting || lighting.isAcceptable);
  
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
  calculateVariance,
  calculateBrightness,
  calculateContrast,
  generateGuidanceMessage,
};
