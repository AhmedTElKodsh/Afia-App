/**
 * E2E Test Constants
 * 
 * Centralized timeout and configuration values for Playwright E2E tests.
 * Use these constants instead of magic numbers for consistency and maintainability.
 */

/**
 * Timeout values in milliseconds
 */
export const TIMEOUTS = {
  /** Camera initialization and stream setup */
  CAMERA_INIT: 20000,
  
  /** Video element ready with dimensions and readyState >= 2 */
  VIDEO_READY: 10000,
  
  /** Standard element visibility check */
  ELEMENT_VISIBLE: 5000,
  
  /** Page navigation and load */
  PAGE_LOAD: 10000,
  
  /** API response timeout */
  API_RESPONSE: 15000,
  
  /** Short wait for React state updates */
  REACT_UPDATE: 500,
} as const;

/**
 * Mock camera configuration
 */
export const MOCK_CAMERA = {
  WIDTH: 640,
  HEIGHT: 480,
  FRAME_RATE: 30,
  READY_STATE: 4, // HAVE_ENOUGH_DATA
} as const;

/**
 * Bottle drawing constants for mock camera canvas
 */
export const BOTTLE_MOCK = {
  BODY: { x: 220, y: 120, width: 200, height: 280 },
  NECK: { x: 270, y: 80, width: 100, height: 50 },
  CAP: { x: 280, y: 60, width: 80, height: 25 },
  GREEN_BAND: { x: 220, y: 200, width: 200, height: 40 },
  HEART_LOGO: { x: 310, y: 220, radius: 15 },
  LABEL: { x: 230, y: 250, width: 180, height: 120 },
  HANDLE: { x: 420, y: 280, radius: 40 },
} as const;

/**
 * Colors for mock bottle rendering
 */
export const COLORS = {
  BACKGROUND: '#e5e5e5',
  BOTTLE_BODY: '#f4e4c1',
  BOTTLE_NECK: '#d4c4a1',
  CAP: '#8B4513',
  AFIA_GREEN: '#10b981',
  HEART_RED: '#ef4444',
  LABEL_WHITE: '#ffffff',
  TEXT_BLACK: '#333333',
} as const;
