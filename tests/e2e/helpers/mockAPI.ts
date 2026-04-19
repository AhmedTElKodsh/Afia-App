import { Page } from '@playwright/test';

/**
 * Mock the /analyze API endpoint with a successful response
 * Returns calibrated values matching the afia-corn-1.5l bottle
 */
export async function mockAnalyzeSuccess(page: Page) {
  // Mock both relative and absolute proxy URLs
  const analyzePattern = /.*\/analyze/;
  await page.route(analyzePattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scanId: 'test-scan-e2e-123',
        fillPercentage: 65,
        remainingMl: 1137, // Calibrated value for 65% fill on afia-corn-1.5l
        confidence: 'high',
        aiProvider: 'gemini',
        latencyMs: 1234,
      }),
    });
  });
}

/**
 * Mock the /analyze API endpoint with low confidence response
 */
export async function mockAnalyzeLowConfidence(page: Page) {
  await page.route(/.*\/analyze/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scanId: 'test-scan-low-conf',
        fillPercentage: 45,
        remainingMl: 675,
        confidence: 'low',
        aiProvider: 'groq',
        latencyMs: 2345,
        imageQualityIssues: ['poor_lighting'],
      }),
    });
  });
}

/**
 * Mock the /analyze API endpoint with error response
 */
export async function mockAnalyzeError(page: Page, statusCode = 500) {
  await page.route(/.*\/analyze/, async (route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Analysis failed',
        code: 'SERVICE_UNAVAILABLE',
      }),
    });
  });
}

/**
 * Mock the /feedback API endpoint
 * NOTE: Pattern must be specific to the API port (8787) to avoid intercepting
 * Vite dev-server module requests like src/config/feedback.ts (port 5173).
 */
export async function mockFeedbackSuccess(page: Page) {
  // Match only the Worker API server URL, not Vite dev-server module URLs
  await page.route(/localhost:8787\/feedback/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        feedbackId: 'test-feedback-123',
        validationStatus: 'accepted',
      }),
    });
  });
}

/**
 * Mock camera getUserMedia API
 */
export async function mockCamera(page: Page) {
  await page.addInitScript(() => {
    // Create fake video stream from canvas
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    // Mock video.play
    const originalPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = async function() {
      return Promise.resolve();
    };

    // Draw a simple bottle shape
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(200, 100, 240, 300); // Bottle body
    ctx.fillStyle = '#654321';
    ctx.fillRect(260, 50, 120, 60); // Bottle neck

    const stream = canvas.captureStream(30);
    const videoTrack = stream.getVideoTracks()[0];
    
    // Mock getCapabilities for torch check
    if (videoTrack) {
      videoTrack.getCapabilities = () => ({
        torch: true,
        whiteBalanceMode: ['continuous', 'manual', 'single-shot'],
        exposureMode: ['continuous', 'manual', 'single-shot'],
        focusMode: ['continuous', 'manual', 'single-shot'],
      } as any);
      
      videoTrack.applyConstraints = async () => {};
    }

    // Mock mediaDevices if it exists
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => stream;
      navigator.mediaDevices.enumerateDevices = async () => [
        {
          deviceId: 'fake-camera',
          kind: 'videoinput',
          label: 'Fake Camera',
          groupId: 'fake-group'
        } as any
      ];
    }
  });
}

/**
 * Mock camera with permission denied
 */
export async function mockCameraPermissionDenied(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new Error('Permission denied');
    };
  });
}
