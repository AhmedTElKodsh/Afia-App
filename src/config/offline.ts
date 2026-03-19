/**
 * Offline Banner Configuration
 * Centralized configuration for offline/error states
 */

export const OFFLINE_CONFIG = {
  /** Error types */
  types: {
    offline: 'offline',
    camera_error: 'camera_error',
    analysis_error: 'analysis_error',
    unknown: 'unknown',
  } as const,
  /** Error messages */
  messages: {
    offline: {
      title: 'No internet connection',
      description: 'Connect to WiFi or cellular data to scan.',
      primaryAction: 'Try Again',
      secondaryAction: 'View History',
    },
    camera_error: {
      title: 'Camera unavailable',
      description: 'Could not access camera. Please check your device settings.',
      primaryAction: 'Try Again',
      secondaryAction: null,
    },
    analysis_error: {
      title: 'Analysis failed',
      description: 'Unable to analyze image. Please try again.',
      primaryAction: 'Retry',
      secondaryAction: 'Retake Photo',
    },
    unknown: {
      title: 'Something went wrong',
      description: 'Please try again.',
      primaryAction: 'Try Again',
      secondaryAction: null,
    },
  },
  /** Icon mapping */
  icons: {
    offline: 'wifi-off',
    camera_error: 'camera-off',
    analysis_error: 'alert-triangle',
    unknown: 'alert-circle',
  },
} as const;

/**
 * Error type union
 */
export type ErrorType = typeof OFFLINE_CONFIG.types[keyof typeof OFFLINE_CONFIG.types];

/**
 * Get error configuration by type
 */
export function getErrorConfig(type: ErrorType) {
  return {
    message: OFFLINE_CONFIG.messages[type],
    icon: OFFLINE_CONFIG.icons[type],
  };
}
