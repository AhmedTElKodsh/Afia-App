/**
 * Test data fixtures for Afia Oil Tracker E2E tests
 *
 * Single-SKU restriction: the app is locked to the 1.5L Afia Corn Oil
 * bottle. All other historical SKUs (sunflower 250ml..3.5L) were removed
 * from the registry — keep only the active bottle here.
 */

export interface TestBottle {
  sku: string;
  name: string;
  volume?: string;
  oilType?: string;
}

export interface TestBottles {
  afiaCorn15L: TestBottle;
  filippoBerio: TestBottle;
  bertolli: TestBottle;
  afia: TestBottle;
  invalid: TestBottle;
}

export const testBottles: TestBottles = {
  afiaCorn15L: {
    sku: 'afia-corn-1.5l',
    name: 'Afia Pure Corn Oil 1.5L',
    volume: '1.5L',
    oilType: 'Corn Oil',
  },
  /** Retained aliases: legacy multi-bottle tests imported these names — all now point to the single active SKU. */
  filippoBerio: {
    sku: 'afia-corn-1.5l',
    name: 'Afia Pure Corn Oil 1.5L',
    volume: '1.5L',
    oilType: 'Corn Oil',
  },
  bertolli: {
    sku: 'afia-corn-1.5l',
    name: 'Afia Pure Corn Oil 1.5L',
    volume: '1.5L',
    oilType: 'Corn Oil',
  },
  afia: {
    sku: 'afia-corn-1.5l',
    name: 'Afia Pure Corn Oil 1.5L',
    volume: '1.5L',
    oilType: 'Corn Oil',
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
    remainingMl: 1137, // calibrated: interpolated from afia-corn-1.5l table at fillHeightPct=65
  },
  lowConfidence: {
    fillPercentage: 45,
    confidence: 'low',
    remainingMl: 675, // 45% of 1500ml
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
