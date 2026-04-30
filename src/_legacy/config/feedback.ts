/**
 * Feedback Configuration
 * Centralized configuration for feedback functionality
 */

export const FEEDBACK_CONFIG = {
  /** Auto-submit delay for "accurate" feedback (ms) */
  autoSubmitDelay: 150,
  /** Feedback types */
  types: {
    ACCURATE: 'accurate',
    TOO_HIGH: 'too-high',
    TOO_LOW: 'too-low',
    WAY_OFF: 'way-off',
  } as const,
} as const;

/**
 * Feedback type union type
 */
export type FeedbackType = typeof FEEDBACK_CONFIG.types[keyof typeof FEEDBACK_CONFIG.types];

/**
 * Feedback button configuration with Lucide icon names
 */
export const FEEDBACK_OPTIONS = [
  {
    type: FEEDBACK_CONFIG.types.ACCURATE,
    label: 'About right',
    icon: 'Check',
    ariaLabel: 'Rate estimate as about right',
  },
  {
    type: FEEDBACK_CONFIG.types.TOO_HIGH,
    label: 'Too high',
    icon: 'ArrowUp',
    ariaLabel: 'Rate estimate as too high',
  },
  {
    type: FEEDBACK_CONFIG.types.TOO_LOW,
    label: 'Too low',
    icon: 'ArrowDown',
    ariaLabel: 'Rate estimate as too low',
  },
  {
    type: FEEDBACK_CONFIG.types.WAY_OFF,
    label: 'Way off',
    icon: 'X',
    ariaLabel: 'Rate estimate as way off',
  },
] as const;
