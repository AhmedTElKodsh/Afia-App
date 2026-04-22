import { Page, expect } from '@playwright/test';
import { TIMEOUTS, MOCK_CAMERA } from '../constants';

/**
 * Wait for video element to be ready with proper dimensions and readyState.
 */
export async function waitForVideoReady(page: Page, timeout = TIMEOUTS.VIDEO_READY): Promise<void> {
  try {
    await page.waitForFunction(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2;
    }, { timeout });
  } catch (err) {
    console.warn('[CameraHelpers] waitForVideoReady timeout, trying to force properties');
    await forceVideoProperties(page);
    // Wait one more time
    await page.waitForFunction(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      return video && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2;
    }, { timeout: 5000 }).catch(() => {
      console.error('[CameraHelpers] waitForVideoReady failed even after forcing properties');
    });
  }
}

/**
 * Force video element to have proper dimensions if mock didn't apply correctly.
 */
export async function forceVideoProperties(page: Page): Promise<void> {
  await page.evaluate(({ width, height, readyState }) => {
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        Object.defineProperty(video, 'videoWidth', { value: width, writable: true, configurable: true });
        Object.defineProperty(video, 'videoHeight', { value: height, writable: true, configurable: true });
      }
      if (video.readyState < 2) {
        Object.defineProperty(video, 'readyState', { value: readyState, writable: true, configurable: true });
      }
      
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
 */
export async function waitForCameraReady(page: Page): Promise<void> {
  // Wait for camera container (support both old and new class names)
  // Use a more inclusive selector and longer timeout
  const container = page.locator('.camera-fullscreen-view, .camera-viewfinder, .camera-container');
  await expect(container.first()).toBeVisible({ timeout: TIMEOUTS.CAMERA_INIT });
  
  // Wait for video element to exist
  const video = page.locator('video');
  await expect(video.first()).toBeAttached({ timeout: TIMEOUTS.CAMERA_INIT });
  
  // Wait for video to have dimensions
  await waitForVideoReady(page);
  
  // Final force for reliability
  await forceVideoProperties(page);
  
  // Give React time to process
  await page.waitForTimeout(TIMEOUTS.REACT_UPDATE);
}
