/**
 * useCameraGuidance Hook
 * 
 * Real-time camera quality analysis with live feedback.
 * Monitors video stream and provides guidance for optimal capture conditions.
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { assessImageQuality, detectBlur, getAngleGuidance, type QualityAssessment } from '../utils/cameraQualityAssessment';

/**
 * Camera guidance configuration
 */
export interface CameraGuidanceConfig {
  /** Minimum blur score to accept capture (0-100) */
  minBlurScore: number;
  /** Require good lighting? */
  requireGoodLighting: boolean;
  /** Analysis interval in milliseconds */
  analysisInterval: number;
  /** Enable haptic feedback? */
  enableHaptics: boolean;
  /** Enable audio cues? */
  enableAudio: boolean;
  /** Quality threshold for "good" indication */
  goodQualityThreshold: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CameraGuidanceConfig = {
  minBlurScore: 50,
  requireGoodLighting: false,
  analysisInterval: 200, // Throttled to 5fps fallback
  enableHaptics: true,
  enableAudio: false,
  goodQualityThreshold: 75,
};

/**
 * Camera guidance state
 */
export interface CameraGuidanceState {
  /** Current quality assessment */
  assessment: QualityAssessment | null;
  /** Is camera ready for capture? */
  isReady: boolean;
  /** Is analysis active? */
  isActive: boolean;
  /** Consecutive good frames count */
  goodFramesCount: number;
  /** Quality trend (improving, stable, declining) */
  qualityTrend: 'improving' | 'stable' | 'declining' | null;
  /** Progress of the hold timer (0-1) */
  holdProgress: number;
  /** True while the hold timer is active */
  isHolding: boolean;
  /** Brand verification status (Stage 0.5) */
  brandDetected: boolean;
  /** Brand verification findings (e.g., green_band, heart_logo) */
  brandFindings: string[];
  /** Angle/tilt status */
  angleStatus: 'good' | 'tilt-up' | 'tilt-down';
  /** Motion/Orientation permission status (iOS specific) */
  orientationPermission: 'granted' | 'denied' | 'prompt';
}

/**
 * Hook return type
 */
export interface UseCameraGuidanceReturn {
  /** Current guidance state */
  state: CameraGuidanceState;
  /** Start guidance analysis */
  startGuidance: (videoElement: HTMLVideoElement) => void;
  /** Stop guidance analysis */
  stopGuidance: () => void;
  /** Manually assess current frame */
  assessNow: () => QualityAssessment | null;
  /** Reset guidance state */
  reset: () => void;
  /** Request motion permissions (iOS) */
  requestOrientation: () => Promise<void>;
}

/**
 * Trigger haptic feedback
 */
function triggerHaptic(pattern: 'success' | 'warning' | 'error') {
  if (!navigator.vibrate) return;
  try {
    switch (pattern) {
      case 'success': navigator.vibrate([30, 50, 30]); break;
      case 'warning': navigator.vibrate(100); break;
      case 'error': navigator.vibrate([150, 50, 150]); break;
    }
  } catch (error) {
    console.warn('Haptic feedback failed:', error);
  }
}

/**
 * Provide sensory feedback based on quality assessment
 */
function provideFeedback(
  assessment: QualityAssessment,
  prevAssessment: QualityAssessment | null,
  config: CameraGuidanceConfig
) {
  if (!config.enableHaptics) return;
  const feedbackType = assessment.guidanceType;
  const stateChanged = !prevAssessment || prevAssessment.guidanceType !== assessment.guidanceType;
  if (stateChanged) triggerHaptic(feedbackType);
}

/**
 * Constants for auto-capture
 */
const HOLD_DURATION_MS = 1000;
const GRACE_PERIOD_MS = 150;
const BRAND_STABILITY_THRESHOLD = 3; // frames

/**
 * Main hook implementation
 */
export function useCameraGuidance(
  config: Partial<CameraGuidanceConfig> = {}
): UseCameraGuidanceReturn {
  const mergedConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameLoopCleanupRef = useRef<(() => void) | null>(null);
  const lastAnalysisRef = useRef<number>(0);
  
  // Refs for auto-capture hold timer
  const holdStartRef = useRef<number | null>(null);
  const lastFailRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastBlurScoreRef = useRef<number>(50);
  const stableBrandCountRef = useRef<number>(0);
  const currentBetaRef = useRef<number | null>(null);
  
  const [state, setState] = useState<CameraGuidanceState>({
    assessment: null,
    isReady: false,
    isActive: false,
    goodFramesCount: 0,
    qualityTrend: null,
    holdProgress: 0,
    isHolding: false,
    brandDetected: false,
    angleStatus: 'good',
    orientationPermission: (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') ? 'prompt' : 'granted',
  });
  
  const prevAssessmentRef = useRef<QualityAssessment | null>(null);
  const analyzeFrameRef = useRef<() => void>(() => {});

  // Device orientation listener
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      currentBetaRef.current = event.beta;
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const requestOrientation = useCallback(async () => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as any;
    if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEventAny.requestPermission();
        setState(prev => ({ ...prev, orientationPermission: permission }));
      } catch (error) {
        console.error('Orientation permission error:', error);
        setState(prev => ({ ...prev, orientationPermission: 'denied' }));
      }
    }
  }, []);

  /**
   * Analysis loop implementation
   */
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastAnalysisRef.current < mergedConfig.analysisInterval) return;
    lastAnalysisRef.current = now;

    frameCountRef.current++;
    // T1.8: Blur runs every other frame; composition runs every frame
    const shouldComputeBlur = frameCountRef.current % 2 === 0;
    if (shouldComputeBlur) {
      lastBlurScoreRef.current = detectBlur(video);
    }
    
    const assessment = assessImageQuality(video, {
      minBlurScore: mergedConfig.minBlurScore,
      requireGoodLighting: mergedConfig.requireGoodLighting,
      precomputedBlurScore: lastBlurScoreRef.current,
    });
    
    const isTestMode = window.__AFIA_TEST_MODE__ === true;
    const angleStatus = getAngleGuidance(currentBetaRef.current);
    
    // Stable brand detection
    if (assessment.composition.isBrandMatch) {
      stableBrandCountRef.current++;
    } else {
      stableBrandCountRef.current = 0;
    }
    const brandDetected = stableBrandCountRef.current >= BRAND_STABILITY_THRESHOLD;

    // Update state
    setState(prev => {
      // Auto-capture criteria: Quality + Brand + Angle
      const isGood = (assessment.isGoodQuality && brandDetected && angleStatus === 'good') || isTestMode;
      
      let holdProgress = 0;
      let isHolding = false;
      let shouldFire = false;
      let currentGoodFramesCount = isGood ? prev.goodFramesCount + 1 : 0;

      if (isGood) {
        lastFailRef.current = null;
        if (!holdStartRef.current) holdStartRef.current = Date.now();
        const elapsed = Date.now() - holdStartRef.current;
        holdProgress = Math.min(1, elapsed / HOLD_DURATION_MS);
        isHolding = holdProgress < 1;
        shouldFire = holdProgress >= 1;
      } else {
        // T2.6: Grace period logic
        if (!lastFailRef.current) lastFailRef.current = Date.now();
        const failDuration = Date.now() - lastFailRef.current;
        
        if (failDuration <= GRACE_PERIOD_MS && holdStartRef.current) {
          holdProgress = prev.holdProgress;
          isHolding = prev.isHolding;
          currentGoodFramesCount = prev.goodFramesCount;
        } else {
          holdStartRef.current = null;
          holdProgress = 0;
          isHolding = false;
          currentGoodFramesCount = 0;
        }
      }
      
      let qualityTrend: 'improving' | 'stable' | 'declining' | null = null;
      if (prev.assessment) {
        const diff = assessment.overallScore - prev.assessment.overallScore;
        if (diff > 5) qualityTrend = 'improving';
        else if (diff < -5) qualityTrend = 'declining';
        else qualityTrend = 'stable';
      }
      
      // T2.5: isReady latches once hold progress reaches 1
      const isReady = prev.isReady || shouldFire || isTestMode;
      
      if (isReady && !prev.isReady && mergedConfig.enableHaptics && navigator.vibrate) {
        navigator.vibrate(40);
      }
      
      return {
        ...prev,
        assessment,
        isReady,
        isActive: true,
        goodFramesCount: currentGoodFramesCount,
        qualityTrend,
        holdProgress,
        isHolding,
        brandDetected,
        brandFindings: assessment.composition.isBrandMatch ? ['verified'] : [], // Simple for now
        angleStatus,
      };
    });
    
    provideFeedback(assessment, prevAssessmentRef.current, mergedConfig);
    prevAssessmentRef.current = assessment;
  }, [mergedConfig]);

  useEffect(() => {
    analyzeFrameRef.current = analyzeFrame;
  }, [analyzeFrame]);

  const startFrameLoop = useCallback((videoEl: HTMLVideoElement, cb: () => void) => {
    let handle: any;
    const isRvfcSupported = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    if (isRvfcSupported) {
      const loop = () => {
        cb();
        handle = (videoEl as any).requestVideoFrameCallback(loop);
      };
      handle = (videoEl as any).requestVideoFrameCallback(loop);
      return () => {
        if (handle) (videoEl as any).cancelVideoFrameCallback(handle);
      };
    } else {
      let rafId: number;
      const loop = () => {
        cb();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    }
  }, []);
  
  const stopGuidance = useCallback(() => {
    if (frameLoopCleanupRef.current) {
      frameLoopCleanupRef.current();
      frameLoopCleanupRef.current = null;
    }
    videoRef.current = null;
    holdStartRef.current = null;
    lastFailRef.current = null;
    setState(prev => ({
      ...prev,
      isActive: false,
      holdProgress: 0,
      isHolding: false,
    }));
  }, []);

  /**
   * Start guidance analysis
   */
  const startGuidance = useCallback((element: HTMLVideoElement | HTMLImageElement) => {
    stopGuidance();
    
    if (element instanceof HTMLVideoElement) {
      videoRef.current = element;
      frameLoopCleanupRef.current = startFrameLoop(element, () => {
        analyzeFrameRef.current();
      });
      const pollUntilReady = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.readyState >= 2) {
          analyzeFrameRef.current();
        } else {
          requestAnimationFrame(pollUntilReady);
        }
      };
      requestAnimationFrame(pollUntilReady);
    } else {
      // Static image mode (for testing)
      const analyzeOnce = () => {
        const analyze = () => {
          // Temporarily swap videoRef to satisfy analyzeFrame
          const originalVideo = videoRef.current;
          (videoRef as any).current = element;
          analyzeFrameRef.current();
          (videoRef as any).current = originalVideo;
        };

        if (element.complete) {
          analyze();
        } else {
          element.onload = analyze;
        }
      };
      
      // Run analysis repeatedly (simulating live feed) so auto-capture etc still works
      const rafId = requestAnimationFrame(function loop() {
        analyzeOnce();
        frameLoopCleanupRef.current = () => cancelAnimationFrame(rafId);
        requestAnimationFrame(loop);
      });
    }
  }, [stopGuidance, startFrameLoop]);
  
  const assessNow = useCallback((): QualityAssessment | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    return assessImageQuality(video, {
      minBlurScore: mergedConfig.minBlurScore,
      requireGoodLighting: mergedConfig.requireGoodLighting,
    });
  }, [mergedConfig.minBlurScore, mergedConfig.requireGoodLighting]);

  const reset = useCallback(() => {
    stopGuidance();
    setState(prev => ({
      ...prev,
      assessment: null,
      isReady: false,
      isActive: false,
      goodFramesCount: 0,
      qualityTrend: null,
      holdProgress: 0,
      isHolding: false,
      brandDetected: false,
      angleStatus: 'good',
    }));
    prevAssessmentRef.current = null;
  }, [stopGuidance]);

  useEffect(() => {
    (window as any).__AFIA_FORCE_READY__ = () => {
      setState(prev => ({ ...prev, isReady: true, goodFramesCount: 10 }));
    };
    return () => {
      delete (window as any).__AFIA_FORCE_READY__;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopGuidance();
    };
  }, [stopGuidance]);
  
  return {
    state,
    startGuidance,
    stopGuidance,
    assessNow,
    reset,
    requestOrientation,
  };
}

export function getQualityColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

export function getGuidanceIcon(type: 'success' | 'warning' | 'error'): string {
  switch (type) {
    case 'success': return '✓';
    case 'warning': return '⚠';
    case 'error': return '✕';
  }
}
