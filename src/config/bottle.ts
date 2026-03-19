/**
 * BottleFillGauge Configuration
 * Centralized configuration for bottle fill gauge
 */

export const BOTTLE_CONFIG = {
  /** Animation duration for fill level (ms) */
  animationDuration: 600,
  /** Fill level thresholds for color changes */
  thresholds: {
    HIGH: 50,    // Green above 50%
    MEDIUM: 25,  // Amber 25-50%
    LOW: 0,      // Red below 25%
  },
  /** SVG dimensions */
  svg: {
    width: 120,
    height: 160,
    viewBox: '0 0 120 160',
  },
  /** Bottle dimensions (as percentages) */
  bottle: {
    bodyWidth: 80,
    bodyHeight: 120,
    neckWidth: 30,
    neckHeight: 20,
    capWidth: 36,
    capHeight: 8,
  },
} as const;

/**
 * Fill level color mapping
 */
export const FILL_COLORS = {
  HIGH: '#10b981',    // Emerald green
  MEDIUM: '#f59e0b',  // Warm amber accent
  LOW: '#ef4444',     // Red
} as const;

/**
 * Get fill color based on percentage
 */
export function getFillColor(percentage: number): string {
  if (percentage >= BOTTLE_CONFIG.thresholds.HIGH) {
    return FILL_COLORS.HIGH;
  } else if (percentage >= BOTTLE_CONFIG.thresholds.MEDIUM) {
    return FILL_COLORS.MEDIUM;
  } else {
    return FILL_COLORS.LOW;
  }
}
