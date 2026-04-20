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
 * Mock camera getUserMedia API with auto-capture support
 * 
 * Creates a realistic mock that triggers auto-capture by:
 * 1. Drawing a bottle image that passes quality checks
 * 2. Including Afia brand markers (green band, heart logo)
 * 3. Providing proper video dimensions and events
 * 4. Simulating good lighting and focus conditions
 */
export async function mockCamera(page: Page) {
  await page.addInitScript(() => {
    // Create fake video stream from canvas with realistic bottle
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    // Draw realistic bottle scene for auto-capture
    // Background - neutral gray (good lighting)
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(0, 0, 640, 480);
    
    // Bottle body - centered and properly sized for "good" distance
    ctx.fillStyle = '#f4e4c1'; // Light oil color
    ctx.fillRect(220, 120, 200, 280); // Main body
    
    // Bottle neck
    ctx.fillStyle = '#d4c4a1';
    ctx.fillRect(270, 80, 100, 50);
    
    // Cap
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(280, 60, 80, 25);
    
    // GREEN BAND - Critical for brand detection (Afia signature)
    ctx.fillStyle = '#10b981'; // Afia green
    ctx.fillRect(220, 200, 200, 40);
    
    // HEART LOGO - Another brand marker
    ctx.fillStyle = '#ef4444'; // Red heart
    ctx.beginPath();
    ctx.arc(310, 220, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Label text area (simulated)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(230, 250, 180, 120);
    
    // Add some text-like marks for realism
    ctx.fillStyle = '#333333';
    ctx.fillRect(240, 270, 160, 8);
    ctx.fillRect(240, 290, 140, 8);
    ctx.fillRect(240, 310, 150, 8);
    
    // Handle
    ctx.strokeStyle = '#d4c4a1';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(420, 280, 40, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();

    // Helper function to setup video element properties
    const setupVideoElement = (video: HTMLVideoElement) => {
      // Set video dimensions immediately
      Object.defineProperty(video, 'videoWidth', { 
        value: 640, 
        writable: true, 
        configurable: true 
      });
      Object.defineProperty(video, 'videoHeight', { 
        value: 480, 
        writable: true, 
        configurable: true 
      });
      Object.defineProperty(video, 'readyState', { 
        value: 4, 
        writable: true, 
        configurable: true 
      });
      
      // Override srcObject setter for this specific video element
      let _srcObject: any = null;
      Object.defineProperty(video, 'srcObject', {
        get() { return _srcObject; },
        set(stream) {
          _srcObject = stream;
          if (stream) {
            // Dispatch events synchronously first for immediate listeners
            video.dispatchEvent(new Event('loadedmetadata'));
            video.dispatchEvent(new Event('loadeddata'));
            video.dispatchEvent(new Event('canplay'));
            video.dispatchEvent(new Event('canplaythrough'));
            
            // Use requestAnimationFrame for more reliable timing with React's render cycle
            // This ensures events fire after the browser has had a chance to update the DOM
            requestAnimationFrame(() => {
              video.dispatchEvent(new Event('loadedmetadata'));
              video.dispatchEvent(new Event('loadeddata'));
              video.dispatchEvent(new Event('canplay'));
              video.dispatchEvent(new Event('canplaythrough'));
            });
          }
        },
        configurable: true
      });
      
      // Override play method
      video.play = async function() {
        video.dispatchEvent(new Event('playing'));
        requestAnimationFrame(() => {
          video.dispatchEvent(new Event('playing'));
        });
        return Promise.resolve();
      };
    };

    // Mock video element creation
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName: string, options?: any) {
      const element = originalCreateElement(tagName, options);
      
      if (tagName.toLowerCase() === 'video') {
        setupVideoElement(element as HTMLVideoElement);
      }
      
      return element;
    };

    // Also setup any existing video elements
    const setupExistingVideos = () => {
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          setupVideoElement(video);
        }
      });
    };

    // Setup existing videos immediately and after DOM changes
    setupExistingVideos();
    const observer = new MutationObserver(() => {
      setupExistingVideos();
    });
    observer.observe(document.body, { childList: true, subtree: true });

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
      
      // Mock getSettings for quality checks
      videoTrack.getSettings = () => ({
        width: 640,
        height: 480,
        aspectRatio: 640 / 480,
        frameRate: 30,
        facingMode: 'environment',
      } as any);
    }

    // Mock mediaDevices
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => stream;
      navigator.mediaDevices.enumerateDevices = async () => [
        {
          deviceId: 'fake-camera',
          kind: 'videoinput',
          label: 'Fake Camera (Back)',
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
