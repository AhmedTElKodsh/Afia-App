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
 * Privacy list items with Lucide icon names and translation keys
 */
export const PRIVACY_DETAILS = [
  {
    icon: 'Camera',
    key: 'privacy.details.camera',
  },
  {
    icon: 'Database',
    key: 'privacy.details.database',
  },
  {
    icon: 'Star',
    key: 'privacy.details.star',
  },
  {
    icon: 'Lock',
    key: 'privacy.details.lock',
  },
  {
    icon: 'Search',
    key: 'privacy.details.search',
  },
] as const;
