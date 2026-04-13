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
  /** Vertical span of detected bottle region as % of the cropped frame height (0–100) */
  visibility: number;
  /** True when a foreground object is detected inside the guide region */
  bottleDetected: boolean;
  /** Horizontal width of detected bottle region as fraction of crop width (0–1); 0 when not detected */
  widthFraction: number;
  /** Horizontal centroid of matched pixels, normalised 0–1 (0 = left, 1 = right); 0.5 when not detected */
  centroidX: number;
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
 * Colour signatures (tightened to reduce false positives from grass, wood, skin):
 *   • Green label  — H 90–160°, S ≥ 35 %, V ≥ 22 %
 *   • Amber/golden oil — H 28–58°, S ≥ 38 %, V ≥ 42 %
 *
 * ROI: centre 40 % horizontally (30–70 %) and 80 % vertically (10–90 %),
 * matching the SVG overlay footprint and excluding floor/ceiling stray colour.
 *
 * Outputs:
 *   bottleDetected — true when matched pixels ≥ 4 % of crop AND three shape
 *                    gates pass: bbox height ≥ 8 rows, aspect ratio ≤ 0.75
 *                    (bottle is taller than wide), neck sparser than body.
 *   distance       — 'too-far' when span < 55 % or width < 20 % or off-centre;
 *                    'too-close' when span > 90 %; 'good' when all pass.
 *   isCentered     — centroid X within ±15 % of crop midpoint (normalised).
 */
export function analyzeComposition(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): CompositionAssessment {
  try {
    const { canvas, ctx } = getProcessingCanvas();

    // ── ROI: tighter crop matching the overlay's ~52%-wide footprint ──────────
    const CROP_X_START = 0.30;   // horizontal start (was 0.20)
    const CROP_X_END   = 0.70;   // horizontal end   (was 0.80)
    const CROP_Y_START = 0.10;   // vertical start   (was 0)
    const CROP_Y_END   = 0.90;   // vertical end     (was 1.0)
    // ── Shape gates ───────────────────────────────────────────────────────────
    const BOTTLE_ASPECT_MAX      = 0.75;  // bboxW/bboxH must be ≤ this (bottle ≈ 0.62)
    const BBOX_MIN_HEIGHT        = 8;     // minimum bbox height in canvas rows
    const NECK_TOP_FRACTION      = 0.25;  // top 25% of bbox = neck zone
    const NECK_BODY_FRACTION     = 0.60;  // bottom 60% of bbox = body zone
    const NECK_MAX_DENSITY_RATIO = 0.40;  // neck pixel density < 40% of body density
    // ── Processing canvas — destination stays fixed ───────────────────────────
    const W = 60;
    const H = 100;
    canvas.width = W;
    canvas.height = H;

    // Draw only the horizontal centre of the source into our canvas.
    // Explicit fallbacks for all three source types (video / image / canvas).
    const srcEl = imageSource as HTMLVideoElement;
    const srcW = srcEl.videoWidth
      || (imageSource as HTMLImageElement).naturalWidth
      || (imageSource as HTMLCanvasElement).width
      || W;
    const srcH = srcEl.videoHeight
      || (imageSource as HTMLImageElement).naturalHeight
      || (imageSource as HTMLCanvasElement).height
      || H;
    // Video metadata not yet loaded — canvas would contain only black pixels.
    if (srcW === 0 || srcH === 0) {
      return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false, widthFraction: 0, centroidX: 0.5 };
    }
    const cropX = srcW * CROP_X_START;
    const cropW = srcW * (CROP_X_END - CROP_X_START);
    const cropY = srcH * CROP_Y_START;
    const cropH = srcH * (CROP_Y_END - CROP_Y_START);
    ctx.drawImage(imageSource, cropX, cropY, cropW, cropH, 0, 0, W, H);

    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    let minRow = H;
    let maxRow = -1;
    let minCol = W;
    let maxCol = -1;
    let matchCount = 0;
    let totalMatchX = 0;
    const rowCounts = new Array<number>(H).fill(0);

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

        // Afia green label: H 90–160°, S ≥ 35 %, V ≥ 22 %
        const isGreen = h >= 90 && h <= 160 && s >= 0.35 && v >= 0.22;
        // Amber/golden oil: H 28–58°, S ≥ 38 %, V ≥ 42 %
        const isAmber = h >= 28 && h <= 58 && s >= 0.38 && v >= 0.42;

        if (isGreen || isAmber) {
          matchCount++;
          totalMatchX += x;
          if (x < minCol) minCol = x;
          if (x > maxCol) maxCol = x;
          rowCounts[y]++;
          if (y < minRow) minRow = y;
          if (y > maxRow) maxRow = y;
        }
      }
    }

    const matchRatio = matchCount / (W * H);
    // Gate 0: colour mass threshold — any single-pixel match sets maxRow > minRow,
    // so the span check is implicit here once matchRatio passes.
    const bottleDetected = matchRatio >= 0.04 && maxRow > minRow;

    if (!bottleDetected) {
      return {
        isCentered: false,
        isLevel: true,
        distance: 'not-detected',
        visibility: 0,
        bottleDetected: false,
        widthFraction: 0,
        centroidX: 0.5,
      };
    }

    // Gate 1b: bounding box too small for reliable shape checks
    const bboxHeight = maxRow - minRow;
    const bboxWidth  = maxCol - minCol;
    if (bboxHeight < BBOX_MIN_HEIGHT || bboxWidth < 2) {
      return { isCentered: false, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: false, widthFraction: 0, centroidX: 0.5 };
    }

    // Centroid X — computed before shape gates so all early returns use the real value.
    // matchCount > 0 guaranteed here: passed matchRatio >= 0.04 (requires ≥ 240 of 6000 px).
    const centroidX  = matchCount > 0 ? totalMatchX / matchCount / W : 0.5;
    const isCentered = Math.abs(centroidX - 0.5) <= 0.15;

    // Gate 2: aspect ratio — bottle must be taller than wide (Afia 1.5L ≈ 0.62)
    const aspectRatio = bboxWidth / bboxHeight;
    if (aspectRatio > BOTTLE_ASPECT_MAX) {
      return { isCentered, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: true, widthFraction: bboxWidth / W, centroidX };
    }

    // Gate 3: neck sparsity — top 25% of bbox must be sparser than bottom 60%
    // rowCounts[y] is absolute canvas row — slice uses absolute indices.
    // +1 on end: Array.slice is end-exclusive; maxRow itself must be included.
    const neckRows   = Math.max(1, Math.floor(bboxHeight * NECK_TOP_FRACTION));
    const bodyRows   = Math.max(1, Math.floor(bboxHeight * NECK_BODY_FRACTION));
    const neckTotal  = rowCounts.slice(minRow, minRow + neckRows).reduce((a, b) => a + b, 0);
    const bodyTotal  = rowCounts.slice(maxRow - bodyRows, maxRow + 1).reduce((a, b) => a + b, 0);
    const neckDensity = neckTotal / (neckRows * bboxWidth);
    const bodyDensity = bodyTotal / (bodyRows * bboxWidth);
    if (bodyDensity === 0 || neckDensity >= NECK_MAX_DENSITY_RATIO * bodyDensity) {
      return { isCentered, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: true, widthFraction: bboxWidth / W, centroidX };
    }

    const spanFraction  = bboxHeight / H;
    const widthFraction = bboxWidth / W;

    // Spec §4.2: matched region too short for confident classification even after shape gates.
    // TODO: tune widthFraction < 0.20 threshold after device testing (spec §4.1 table uses 0.35).
    if (spanFraction < 0.30) {
      return { isCentered, isLevel: true, distance: 'not-detected', visibility: 0, bottleDetected: true, widthFraction, centroidX };
    }

    // 'good' requires: vertical 55–90 %, width ≥ 20 %, and centred.
    // Any single failure → 'too-far' (amber); span > 90 % → 'too-close'.
    let distance: 'too-close' | 'too-far' | 'good';
    if (spanFraction > 0.90) {
      distance = 'too-close';
    } else if (spanFraction < 0.55 || widthFraction < 0.20 || !isCentered) {
      distance = 'too-far';
    } else {
      distance = 'good';
    }

    return {
      isCentered,
      isLevel: true,
      distance,
      visibility: Math.round(spanFraction * 100),
      bottleDetected: true,
      widthFraction,
      centroidX,
    };
  } catch (error) {
    console.error('Composition analysis error:', error);
    return {
      isCentered: false,
      isLevel: true,
      distance: 'not-detected',
      visibility: 0,
      bottleDetected: false,
      widthFraction: 0,
      centroidX: 0.5,
    };
  }
}

/**
 * Generate guidance message based on quality assessment.
 * Returns an i18n key (camera.*) so callers can translate via t().
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
    return { message: 'camera.alignBottle', type: 'error' };
  }

  if (composition.distance === 'too-far') {
    // Spec §4.3: only show centreBottle when span is adequate (>=55%) but bottle is off-centre.
    // If span < 55% the primary fix is distance, not centering — show moveCloser instead.
    if (!composition.isCentered && composition.visibility >= 55) {
      return { message: 'camera.centreBottle', type: 'warning' };
    }
    return { message: 'camera.moveCloser', type: 'warning' };
  }

  if (composition.distance === 'too-close') {
    return { message: 'camera.moveBack', type: 'warning' };
  }

  // Lighting
  if (lighting.status === 'too-dark') {
    return { message: 'camera.tooDark', type: 'error' };
  }

  if (lighting.status === 'too-bright') {
    return { message: 'camera.tooBright', type: 'warning' };
  }

  if (lighting.status === 'low-contrast') {
    return { message: 'camera.lowContrast', type: 'warning' };
  }

  // Blur
  if (blurScore < 30) {
    return { message: 'camera.holdSteady', type: 'error' };
  }

  if (blurScore < 45) {
    return { message: 'camera.holdStill', type: 'warning' };
  }

  return {
    message: 'camera.perfect',
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
    precomputedBlurScore?: number; // NEW: allow passing throttled blur score
  } = {}
): QualityAssessment {
  const {
    minBlurScore = 50,
    requireGoodLighting = true,
    precomputedBlurScore,
  } = options;

  // Internal implementation to allow timing guard
  const _runAssessment = (): QualityAssessment => {
    // Run all assessments
    const blurScore = precomputedBlurScore !== undefined ? precomputedBlurScore : detectBlur(imageSource);
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
  };

  // Winston: dev-only timing guard
  if (import.meta.env.DEV) {
    const t0 = performance.now();
    const result = _runAssessment();
    const elapsed = performance.now() - t0;
    if (elapsed > 6) {
      console.warn(`[camera] assessment took ${elapsed.toFixed(1)} ms — consider throttling`);
    }
    return result;
  }

  return _runAssessment();
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
