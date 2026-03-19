/**
 * Confidence Badge Configuration
 * Centralized configuration for AI confidence indicators
 */

export const CONFIDENCE_CONFIG = {
  /** Confidence levels */
  levels: {
    high: 'high',
    medium: 'medium',
    low: 'low',
  } as const,
  /** Color mapping for confidence levels */
  colors: {
    high: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: '#10b981',
      text: '#10b981',
      icon: '✓',
    },
    medium: {
      bg: 'rgba(245, 158, 11, 0.15)',  // Warm amber accent
      border: '#f59e0b',
      text: '#f59e0b',
      icon: '⚠',
    },
    low: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: '#ef4444',
      text: '#ef4444',
      icon: '✕',
    },
  },
  /** Plain language messages for each confidence level */
  messages: {
    high: 'High confidence',
    medium: 'Medium confidence - verify if possible',
    low: 'Low confidence - consider retaking',
  },
} as const;

/**
 * Confidence level type
 */
export type ConfidenceLevel = typeof CONFIDENCE_CONFIG.levels[keyof typeof CONFIDENCE_CONFIG.levels];

/**
 * Get confidence configuration by level
 */
export function getConfidenceConfig(level: ConfidenceLevel) {
  return {
    color: CONFIDENCE_CONFIG.colors[level],
    message: CONFIDENCE_CONFIG.messages[level],
  };
}
