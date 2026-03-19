/**
 * Privacy Configuration
 * Centralized configuration for privacy functionality
 */

export const PRIVACY_CONFIG = {
  /** LocalStorage key for privacy acceptance */
  storageKey: 'afia_privacy_accepted',
  /** Shake animation duration for error state (ms) */
  shakeDuration: 500,
} as const;

/**
 * Privacy list items with Lucide icon names
 */
export const PRIVACY_DETAILS = [
  {
    icon: 'Camera',
    text: 'Images sent to AI analysis server',
  },
  {
    icon: 'Database',
    text: 'Stored with AI estimate for training',
  },
  {
    icon: 'Star',
    text: 'Optional feedback rating stored',
  },
  {
    icon: 'Lock',
    text: 'Not linked to personal identity',
  },
  {
    icon: 'Search',
    text: 'Reviewed to improve accuracy',
  },
] as const;
