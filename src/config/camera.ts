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
} as const;

/**
 * Get video constraints with fallback support
 */
export function getVideoConstraints(
  useBackCamera: boolean = true
): MediaStreamConstraints {
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

    const capabilities = track.getCapabilities() as any;
    return !!capabilities.torch;
  } catch {
    return false;
  }
}
