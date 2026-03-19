/**
 * Haptic Feedback Utility
 *
 * Provides tactile feedback for user interactions on supported devices.
 * Uses the Navigator.vibrate API for Android and fallback patterns for iOS.
 *
 * Features:
 * - Multiple haptic patterns for different interactions
 * - Feature detection
 * - Graceful fallback for unsupported browsers
 * - Respects user preferences (reduced motion)
 *
 * Browser Support:
 * - Android Chrome/Edge: Full support via Navigator.vibrate
 * - iOS Safari: Limited (no vibrate API), use audio/visual feedback
 * - Desktop: No support, gracefully degrades
 */

/**
 * Haptic pattern presets
 */
export const HAPTIC_PATTERNS = {
  /** Light tap - subtle confirmation */
  light: 10,

  /** Medium tap - standard button press */
  medium: 20,

  /** Heavy tap - important actions */
  heavy: 30,

  /** Success - double tap pattern */
  success: [15, 50, 15],

  /** Error - long vibration */
  error: 50,

  /** Warning - triple tap pattern */
  warning: [20, 40, 20, 40, 20],

  /** Scan complete - satisfying confirmation */
  scan: [10, 30, 10, 30, 10],

  /** Shutter click - camera capture */
  shutter: [5, 20, 5],
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return "vibrate" in navigator;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Trigger haptic feedback
 *
 * @param pattern - Haptic pattern name or custom duration/pattern
 * @param options - Optional configuration
 *
 * @example
 * // Use preset pattern
 * haptic("success");
 *
 * @example
 * // Use custom duration
 * haptic(25);
 *
 * @example
 * // Use custom pattern
 * haptic([10, 20, 10]);
 *
 * @example
 * // Force haptic even with reduced motion (for critical feedback)
 * haptic("error", { ignoreReducedMotion: true });
 */
export function haptic(
  pattern: HapticPattern | number | number[],
  options: { ignoreReducedMotion?: boolean } = {}
): void {
  // Respect reduced motion preference unless explicitly overridden
  if (!options.ignoreReducedMotion && prefersReducedMotion()) {
    return;
  }

  // Check for support
  if (!isHapticSupported()) {
    // Could add audio fallback here in the future
    return;
  }

  // Resolve pattern to vibration value
  let vibration: number | ReadonlyArray<number>;

  if (typeof pattern === "string") {
    vibration = HAPTIC_PATTERNS[pattern];
  } else {
    vibration = pattern;
  }

  // Trigger vibration
  try {
    navigator.vibrate(vibration as number | number[]);
  } catch (error) {
    // Silently fail - haptics are non-essential
    console.warn("Haptic feedback failed:", error);
  }
}

/**
 * Convenience methods for common haptic feedback scenarios
 */
export const hapticFeedback = {
  /** Button press confirmation */
  press: () => haptic("light"),

  /** Successful action completion */
  success: () => haptic("success"),

  /** Error or failed action */
  error: () => haptic("error"),

  /** Warning or caution */
  warning: () => haptic("warning"),

  /** Scan/capture event */
  scan: () => haptic("scan"),

  /** Camera shutter */
  shutter: () => haptic("shutter"),

  /** Form submission */
  submit: () => haptic("medium"),

  /** Delete/remove action */
  delete: () => haptic("heavy"),

  /** Toggle switch */
  toggle: () => haptic("light"),

  /** Long press activation */
  longPress: () => haptic("heavy"),
} as const;

/**
 * Initialize haptic feedback system
 * Call this on first user interaction to warm up the haptic engine
 */
export function initHaptics(): void {
  // Prime the haptic system with a minimal vibration
  // This ensures subsequent vibrations are responsive
  if (isHapticSupported() && !prefersReducedMotion()) {
    try {
      navigator.vibrate(1);
    } catch {
      // Ignore initialization errors
    }
  }
}
