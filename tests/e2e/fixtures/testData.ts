/**
 * Test data fixtures for Afia Oil Tracker E2E tests
 */

export const testBottles = {
  filippoBerio: {
    sku: 'afia-sunflower-500ml',
    name: 'Afia Pure Sunflower Oil 500ml',
    volume: '500ml',
    oilType: 'Sunflower Oil',
  },
  bertolli: {
    sku: 'afia-sunflower-700ml',
    name: 'Afia Pure Sunflower Oil 700ml',
    volume: '700ml',
    oilType: 'Sunflower Oil',
  },
  afia: {
    sku: 'afia-sunflower-1l',
    name: 'Afia Pure Sunflower Oil 1L',
    volume: '1L',
    oilType: 'Sunflower Oil',
  },
  invalid: {
    sku: 'invalid-bottle-xyz',
    name: 'Invalid Test Bottle',
  },
};

export const testImages = {
  /**
   * Base64 placeholder image (1x1 pixel, used for testing)
   * Replace with real test images as needed
   */
  placeholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
};

export const expectedResults = {
  highConfidence: {
    fillPercentage: 65,
    confidence: 'high',
    remainingMl: 325,
  },
  lowConfidence: {
    fillPercentage: 45,
    confidence: 'low',
    remainingMl: 225,
  },
};

export const navigationViews = {
  landing: 'QR Landing Page',
  camera: 'Camera Capture',
  preview: 'Photo Preview',
  loading: 'API Loading',
  result: 'Result Display',
  feedback: 'Feedback Prompt',
};
