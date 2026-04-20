import { Page } from '@playwright/test';
import { TIMEOUTS, MOCK_CAMERA } from '../constants';

/**
 * Wait for video element to be ready with proper dimensions and readyState.
 * 
 * This helper consolidates the common pattern of checking video readiness
 * across multiple test files, ensuring consistency and reducing duplication.
 * 
 * @param page - Playwright page object
 * @param timeout - Maximum wait time in milliseconds (default: TIMEOUTS.VIDEO_READY)
 * @returns Promise that resolves when video is ready
 */
export async function waitForVideoReady(page: Page, timeout = TIMEOUTS.VIDEO_READY): Promise<void> {
  await page.waitForFunction(() => {
    const video = document.querySelector('video.camera-video') as HTMLVideoElement;
    return video && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2;
  }, { timeout });
}

/**
 * Force video element to have proper dimensions if mock didn't apply correctly.
 * 
 * This is a fallback mechanism for when the mock camera initialization
 * doesn't properly set video dimensions. It manually sets the properties
 * and dispatches the necessary events to trigger React state updates.
 * 
 * @param page - Playwright page object
 */
export async function forceVideoProperties(page: Page): Promise<void> {
  await page.evaluate(({ width, height, readyState }) => {
    const video = document.querySelector('video.camera-video') as HTMLVideoElement;
    if (video && (video.videoWidth === 0 || video.videoHeight === 0)) {
      Object.defineProperty(video, 'videoWidth', { value: width, writable: true, configurable: true });
      Object.defineProperty(video, 'videoHeight', { value: height, writable: true, configurable: true });
      Object.defineProperty(video, 'readyState', { value: readyState, writable: true, configurable: true });
      
      // Dispatch events to trigger React state updates
      video.dispatchEvent(new Event('loadedmetadata'));
      video.dispatchEvent(new Event('loadeddata'));
      video.dispatchEvent(new Event('canplay'));
      video.dispatchEvent(new Event('canplaythrough'));
      video.dispatchEvent(new Event('playing'));
    }
  }, { width: MOCK_CAMERA.WIDTH, height: MOCK_CAMERA.HEIGHT, readyState: MOCK_CAMERA.READY_STATE });
}

/**
 * Wait for camera container to be active and video to be ready.
 * 
 * This is the complete camera initialization sequence used across tests.
 * It waits for:
 * 1. Camera container to have 'camera-active' class
 * 2. Video element to exist in DOM
 * 3. Video to have proper dimensions and readyState
 * 4. Falls back to forcing properties if needed
 * 
 * @param page - Playwright page object
 */
export async function waitForCameraReady(page: Page): Promise<void> {
  // Wait for camera container to be active
  await page.waitForSelector('.camera-container.camera-active', { 
    state: 'visible', 
    timeout: TIMEOUTS.CAMERA_INIT 
  });
  
  // Wait for video element to exist
  await page.waitForSelector('video.camera-video', { 
    state: 'attached', 
    timeout: TIMEOUTS.CAMERA_INIT 
  });
  
  // Wait for video to have dimensions
  await waitForVideoReady(page);
  
  // Force properties as fallback
  await forceVideoProperties(page);
  
  // Give React time to process
  await page.waitForTimeout(TIMEOUTS.REACT_UPDATE);
}
