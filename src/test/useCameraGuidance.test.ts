import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCameraGuidance } from '../hooks/useCameraGuidance';
import * as assessmentUtils from '../utils/cameraQualityAssessment';

vi.mock('../utils/cameraQualityAssessment', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/cameraQualityAssessment')>();
  return {
    ...actual,
    assessImageQuality: vi.fn(),
    detectBlur: vi.fn(),
    getAngleGuidance: vi.fn().mockReturnValue('good'),
  };
});

describe('useCameraGuidance hold timer', () => {
  let now = 0;
  let rafCallbacks: FrameRequestCallback[] = [];
  let videoElement: HTMLVideoElement;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 1000;
    vi.stubGlobal('performance', { now: () => now });
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    
    // Create real video element
    videoElement = document.createElement('video');
    Object.defineProperty(videoElement, 'readyState', { get: () => 2, configurable: true });
    Object.defineProperty(videoElement, 'videoWidth', { get: () => 640, configurable: true });
    Object.defineProperty(videoElement, 'videoHeight', { get: () => 480, configurable: true });

    // Mock requestAnimationFrame to capture callback
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      rafCallbacks.push(cb);
      return 0;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    // Mock requestVideoFrameCallback on the prototype
    if (!(HTMLVideoElement.prototype as any).requestVideoFrameCallback) {
      (HTMLVideoElement.prototype as any).requestVideoFrameCallback = function(cb: any) {
        rafCallbacks.push(cb);
        return 0;
      };
      (HTMLVideoElement.prototype as any).cancelVideoFrameCallback = function() {};
    } else {
      vi.spyOn(HTMLVideoElement.prototype, 'requestVideoFrameCallback').mockImplementation((cb) => {
        rafCallbacks.push(cb as any);
        return 0;
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    rafCallbacks = [];
  });

  function advance(ms: number) {
    act(() => {
      now += ms;
      vi.advanceTimersByTime(ms);
      
      // Flush all pending callbacks
      let limit = 20; // safety limit
      while (rafCallbacks.length > 0 && limit > 0) {
        const callbacks = [...rafCallbacks];
        rafCallbacks = [];
        callbacks.forEach(cb => cb(now));
        limit--;
      }
    });
  }

  it('T6.2: holdProgress reaches 1 after 1000ms of good quality', async () => {
    const { result } = renderHook(() => useCameraGuidance({ analysisInterval: 100 }));
    
    vi.mocked(assessmentUtils.assessImageQuality).mockReturnValue({
      isGoodQuality: true,
      overallScore: 80,
      blurScore: 80,
      lighting: { isAcceptable: true, status: 'good' },
      composition: { isBrandMatch: true, distance: 'good', bottleDetected: true, isCentered: true, visibility: 80 },
      guidanceMessage: 'camera.perfect',
      guidanceType: 'success',
    } as any);

    await act(async () => {
      result.current.startGuidance(videoElement);
    });

    // Initial flush for pollUntilReady
    advance(0);

    // Need 3 frames for brandDetected (BRAND_STABILITY_THRESHOLD = 3)
    // We do 6 frames at 110ms to be absolutely sure
    for (let i = 0; i < 6; i++) advance(110);

    expect(result.current.state.brandDetected).toBe(true);
    expect(result.current.state.isHolding).toBe(true);
    
    // Advance another 1000ms to ensure it's done
    advance(1000);
    expect(result.current.state.holdProgress).toBe(1);
    expect(result.current.state.isReady).toBe(true);
  });

  it('T6.2b: grace period handles micro-trembles (<= 150ms)', async () => {
    const { result } = renderHook(() => useCameraGuidance({ analysisInterval: 100 }));
    
    const goodQuality = {
      isGoodQuality: true,
      composition: { isBrandMatch: true, distance: 'good', bottleDetected: true, isCentered: true, visibility: 80 },
      guidanceType: 'success',
    } as any;

    const badQuality = {
      isGoodQuality: false,
      composition: { isBrandMatch: false, distance: 'too-far', bottleDetected: true, isCentered: true, visibility: 40 },
      guidanceType: 'warning',
    } as any;

    vi.mocked(assessmentUtils.assessImageQuality).mockReturnValue(goodQuality);

    await act(async () => {
      result.current.startGuidance(videoElement);
    });

    // Initial flush
    advance(0);

    // Latch brand (6 frames)
    for (let i = 0; i < 6; i++) advance(110);
    expect(result.current.state.brandDetected).toBe(true);
    
    // Advance 500ms
    advance(500);
    const progressBefore = result.current.state.holdProgress;
    expect(progressBefore).toBeGreaterThan(0);

    // One bad frame within grace period (100ms)
    vi.mocked(assessmentUtils.assessImageQuality).mockReturnValue(badQuality);
    advance(100);
    
    // Should NOT reset
    expect(result.current.state.isHolding).toBe(true);
    expect(result.current.state.holdProgress).toBe(progressBefore);

    // Back to good quality - need 3 frames again to re-stabilize brand
    vi.mocked(assessmentUtils.assessImageQuality).mockReturnValue(goodQuality);
    for (let i = 0; i < 4; i++) advance(110);
    
    advance(1000); 
    
    expect(result.current.state.isReady).toBe(true);
  });

  it('T6.2c: sustained failure (> 150ms) resets hold timer', async () => {
    const { result } = renderHook(() => useCameraGuidance({ analysisInterval: 100 }));
    
    const goodQuality = {
      isGoodQuality: true,
      composition: { isBrandMatch: true, distance: 'good', bottleDetected: true, isCentered: true, visibility: 80 },
      guidanceType: 'success',
    } as any;

    const badQuality = {
      isGoodQuality: false,
      composition: { isBrandMatch: false, distance: 'too-far', bottleDetected: true, isCentered: true, visibility: 40 },
      guidanceType: 'warning',
    } as any;

    vi.mocked(assessmentUtils.assessImageQuality).mockReturnValue(goodQuality);

    await act(async () => {
      result.current.startGuidance(videoElement);
    });

    // Initial flush
    advance(0);

    // Latch brand
    for (let i = 0; i < 6; i++) advance(110);
    
    advance(500);
    expect(result.current.state.holdProgress).toBeGreaterThan(0);

    // Bad quality for 200ms
    vi.mocked(assessmentUtils.assessImageQuality).mockReturnValue(badQuality);
    advance(100); // failDuration = 0 (first bad frame detected)
    advance(100); // failDuration = 100 (grace)
    advance(100); // failDuration = 200 (expired)
    
    // Should reset
    expect(result.current.state.holdProgress).toBe(0);
    expect(result.current.state.isHolding).toBe(false);
  });
});
