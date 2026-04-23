/**
 * Camera Configuration
 * Centralized configuration for camera functionality
 * 
 * Includes:
 * - Capture settings
 * - Quality thresholds for live guidance
 * - Framing guide dimensions
 * - Video constraints
 */

export const CAMERA_CONFIG = {
  /** Video capture resolution */
  capture: {
    width: 800,
    height: 600,
  },
  /** JPEG compression quality (0.0 - 1.0) */
  jpegQuality: 0.8,
  /** Default framing guide dimensions */
  framingGuide: {
    widthPercent: 65,
    heightPercent: 55,
    defaultAspectRatio: 1.18, // Typical bottle ratio
  },
  /** Video constraints priorities */
  videoConstraints: {
    preferredFacingMode: 'environment' as const,
    fallbackFacingMode: 'user' as const,
    idealWidth: 1280,
    idealHeight: 720,
  },
  /** Live guidance quality thresholds */
  minQuality: {
    /** Minimum blur score (0-100, higher = sharper) */
    blurScore: 50,
    /** Minimum overall quality score (0-100) */
    overallScore: 60,
    /** Minimum brightness (0-255) */
    brightness: 50,
    /** Maximum brightness (0-255) */
    maxBrightness: 230,
  },
  /** Guidance analysis interval in milliseconds */
  guidanceAnalysisInterval: 500,

  /** 
   * Bottle Detection & Composition Config 
   * Extracted from analyzeComposition.ts for structural integrity
   */
  detection: {
    crop: {
      xStart: 0.30,
      xEnd: 0.70,
      yStart: 0.10,
      yEnd: 0.90,
    },
    thresholds: {
      bottleAspectMax: 0.75,
      bboxMinHeight: 8,
      neckTopFraction: 0.25,
      neckBodyFraction: 0.60,
      neckMaxDensityRatio: 0.50,
      minMatchRatio: 0.04,
      centeringTolerance: 0.15,
      minSpanFraction: 0.30,
      maxSpanFraction: 0.90,
      goodSpanStart: 0.55,
      minWidthFraction: 0.35,
    },
    hsv: {
      greenBand: { h: [90, 160], s: [0.35, 1.0], v: [0.22, 1.0] },
      oilAmber: { h: [28, 58], s: [0.38, 1.0], v: [0.42, 1.0] },
      brandRed: { h: [330, 360], s: [0.45, 1.0], v: [0.35, 1.0] }, // Includes wrap-around 0-15
      brandRedAlt: { h: [0, 15], s: [0.45, 1.0], v: [0.35, 1.0] },
      highContrast: { s: [0, 0.25], v: [0.80, 1.0] },
    }
  },

  /** Brand Verification Logic */
  brand: {
    weights: {
      greenBand: 40,
      heartLogo: 30,
      textContrast: 30,
    },
    minRatios: {
      greenBand: 0.10,
      heartLogo: 0.005,
      textContrast: 0.01,
    },
    matchCriteria: {
      minGreen: 0.08,
      minSecondary: 0.003, // redRatio
      minTertiary: 0.008, // textRatio
    }
  },

  /** Auto-Capture Timing */
  autoCapture: {
    holdDurationMs: 1000,
    gracePeriodMs: 150,
  }
} as const;

/**
 * Get video constraints with fallback support
 *
 * @param useBackCamera Prefer environment (back) / user (front) when supported
 * @param relaxed If true, use minimal `video: true` only — best for E2E / fake devices
 *        where `facingMode: environment` can block or never resolve
 */
export function getVideoConstraints(
  useBackCamera: boolean = true,
  relaxed: boolean = false
): MediaStreamConstraints {
  if (relaxed) {
    return { video: true, audio: false };
  }
  const facingMode = useBackCamera
    ? CAMERA_CONFIG.videoConstraints.preferredFacingMode
    : CAMERA_CONFIG.videoConstraints.fallbackFacingMode;

  return {
    video: {
      facingMode,
      width: { ideal: CAMERA_CONFIG.videoConstraints.idealWidth },
      height: { ideal: CAMERA_CONFIG.videoConstraints.idealHeight },
    },
    audio: false,
  };
}

/**
 * Check if torch/flashlight is supported
 */
export async function checkTorchSupport(
  stream: MediaStream
): Promise<boolean> {
  try {
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    return !!capabilities.torch;
  } catch {
    return false;
  }
}
