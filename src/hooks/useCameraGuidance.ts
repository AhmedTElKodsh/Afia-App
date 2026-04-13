/**
 * useCameraGuidance Hook
 * 
 * Real-time camera quality analysis with live feedback.
 * Monitors video stream and provides guidance for optimal capture conditions.
 * 
 * Features:
 * - Real-time blur detection
 * - Lighting quality assessment
 * - Composition guidance
 * - Haptic feedback (on supported devices)
 * - Audio cues (optional)
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { assessImageQuality, detectBlur, type QualityAssessment } from '../utils/cameraQualityAssessment';

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
  requireGoodLighting: false, // Be lenient for initial implementation
  analysisInterval: 500, // Analyze every 500ms
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
}

/**
 * Audio context for feedback sounds (lazy initialized)
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      // @ts-expect-error - Vendor prefix
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        audioContext = new AudioContextCtor();
      }
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }
  return audioContext;
}

/**
 * Play audio cue for guidance feedback
 */
function playAudioCue(type: 'success' | 'warning' | 'error') {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    switch (type) {
      case 'success': {
        // Pleasant ascending chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
        gain1.gain.setValueAtTime(0.1, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);
        break;
      }
        
      case 'warning': {
        // Gentle warning tone
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(440, now); // A4
        gain2.gain.setValueAtTime(0.05, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.2);
        break;
      }
        
      case 'error': {
        // Descending warning
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(300, now);
        osc3.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain3.gain.setValueAtTime(0.08, now);
        gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now);
        osc3.stop(now + 0.2);
        break;
      }
    }
  } catch (error) {
    console.warn('Audio cue failed:', error);
  }
}

/**
 * Trigger haptic feedback
 */
function triggerHaptic(pattern: 'success' | 'warning' | 'error') {
  if (!navigator.vibrate) return;
  
  try {
    switch (pattern) {
      case 'success':
        // Short pleasant vibration
        navigator.vibrate([30, 50, 30]);
        break;
        
      case 'warning':
        // Single medium vibration
        navigator.vibrate(100);
        break;
        
      case 'error':
        // Double vibration
        navigator.vibrate([150, 50, 150]);
        break;
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
  if (!config.enableHaptics && !config.enableAudio) return;
  
  const feedbackType = assessment.guidanceType;
  
  // Only provide feedback on state changes
  const stateChanged = !prevAssessment || 
    prevAssessment.guidanceType !== assessment.guidanceType;
  
  if (!stateChanged) return;
  
  // Haptic feedback
  if (config.enableHaptics) {
    triggerHaptic(feedbackType);
  }
  
  // Audio feedback
  if (config.enableAudio) {
    playAudioCue(feedbackType);
  }
}

/**
 * Constants for auto-capture
 */
const HOLD_DURATION_MS = 1000;
const GRACE_PERIOD_MS = 150;

/**
 * Main hook implementation
 */
export function useCameraGuidance(
  config: Partial<CameraGuidanceConfig> = {}
): UseCameraGuidanceReturn {
  // Merge with defaults - memoized to prevent recreation on every render
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
  
  const [state, setState] = useState<CameraGuidanceState>({
    assessment: null,
    isReady: false,
    isActive: false,
    goodFramesCount: 0,
    qualityTrend: null,
    holdProgress: 0,
    isHolding: false,
  });
  
  const prevAssessmentRef = useRef<QualityAssessment | null>(null);
  const analyzeFrameRef = useRef<() => void>(() => {});

  /**
   * Analysis loop implementation
   */
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      // Video not ready, loop will continue via rVFC/rAF
      return;
    }

    // Throttle: only run heavy assessment at mergedConfig.analysisInterval
    const now = performance.now();
    if (now - lastAnalysisRef.current < mergedConfig.analysisInterval) {
      return;
    }
    lastAnalysisRef.current = now;

    // Throttle blur detection to every other frame
    frameCountRef.current++;
    const shouldComputeBlur = frameCountRef.current % 2 === 0;
    
    if (shouldComputeBlur) {
      lastBlurScoreRef.current = detectBlur(video);
    }
    
    // Run assessment with precomputed blur score
    const assessment = assessImageQuality(video, {
      minBlurScore: mergedConfig.minBlurScore,
      requireGoodLighting: mergedConfig.requireGoodLighting,
      precomputedBlurScore: lastBlurScoreRef.current,
    });
    
    // Check for test mode bypass
    const isTestMode = window.__AFIA_TEST_MODE__ === true;
    
    // Update state
    setState(prev => {
      const isGood = assessment.isGoodQuality || isTestMode;
      
      // Auto-capture hold timer logic
      let holdProgress = 0;
      let isHolding = false;
      let shouldFire = false;
      let currentGoodFramesCount = isGood ? prev.goodFramesCount + 1 : 0;

      if (isGood) {
        lastFailRef.current = null;
        if (!holdStartRef.current) {
          holdStartRef.current = Date.now();
        }
        const elapsed = Date.now() - holdStartRef.current;
        holdProgress = Math.min(1, elapsed / HOLD_DURATION_MS);
        isHolding = holdProgress < 1;
        shouldFire = holdProgress >= 1;
      } else {
        // Grace period: absorb micro-trembles < 150ms
        if (!lastFailRef.current) {
          lastFailRef.current = Date.now();
        }
        const failDuration = Date.now() - lastFailRef.current;
        
        if (failDuration <= GRACE_PERIOD_MS && holdStartRef.current) {
          // Keep previous hold values during grace period
          holdProgress = prev.holdProgress;
          isHolding = prev.isHolding;
          currentGoodFramesCount = prev.goodFramesCount;
        } else {
          // Sustained failure: reset hold timer
          holdStartRef.current = null;
          lastFailRef.current = null;
          holdProgress = 0;
          isHolding = false;
          currentGoodFramesCount = 0;
        }
      }
      
      // Determine quality trend
      let qualityTrend: 'improving' | 'stable' | 'declining' | null = null;
      if (prev.assessment) {
        const diff = assessment.overallScore - prev.assessment.overallScore;
        if (diff > 5) qualityTrend = 'improving';
        else if (diff < -5) qualityTrend = 'declining';
        else qualityTrend = 'stable';
      }
      
      // Ready when hold timer completes (or test mode)
      const isReady = shouldFire || isTestMode;
      
      // Haptic "Ready" Click - only on the transition to ready
      if (isReady && !prev.isReady && mergedConfig.enableHaptics && navigator.vibrate) {
        navigator.vibrate(40); // Sharp, subtle "click"
      }
      
      return {
        assessment,
        isReady,
        isActive: true,
        goodFramesCount: currentGoodFramesCount,
        qualityTrend,
        holdProgress,
        isHolding,
      };
    });
    
    // Provide sensory feedback
    provideFeedback(assessment, prevAssessmentRef.current, mergedConfig);
    
    // Store for next comparison
    prevAssessmentRef.current = assessment;
  }, [mergedConfig]);

  // Keep ref up to date
  useEffect(() => {
    analyzeFrameRef.current = analyzeFrame;
  }, [analyzeFrame]);

  /**
   * High-performance frame loop using requestVideoFrameCallback if available
   */
  const startFrameLoop = useCallback((videoEl: HTMLVideoElement, cb: () => void) => {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const loop = () => {
        cb();
        videoEl.requestVideoFrameCallback(loop);
      };
      // @ts-expect-error - requestVideoFrameCallback is a newer Web API
      const handle = videoEl.requestVideoFrameCallback(loop);
      return () => {
        // rVFC doesn't have an explicit cancel method, it stops when the element is removed
        // or when we stop calling it in the callback.
      };
    } else {
      // Fallback: throttled requestAnimationFrame
      let rafId: number;
      const loop = () => {
        cb();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    }
  }, []);
  
  /**
   * Stop guidance analysis
   */
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
   * Start guidance analysis once camera is active
   */
  const startGuidance = useCallback((videoElement: HTMLVideoElement) => {
    // Stop any existing analysis
    stopGuidance();
    
    videoRef.current = videoElement;
    
    // Start analysis loop
    frameLoopCleanupRef.current = startFrameLoop(videoElement, () => {
      analyzeFrameRef.current();
    });
  }, [stopGuidance, startFrameLoop]);
  
  /**
   * Manually assess current frame
   */
  const assessNow = useCallback((): QualityAssessment | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    
    const assessment = assessImageQuality(video, {
      minBlurScore: mergedConfig.minBlurScore,
      requireGoodLighting: mergedConfig.requireGoodLighting,
    });
    
    return assessment;
  }, [mergedConfig.minBlurScore, mergedConfig.requireGoodLighting]);
  /**
   * Reset guidance state
   */
  const reset = useCallback(() => {
    stopGuidance();
    setState({
      assessment: null,
      isReady: false,
      isActive: false,
      goodFramesCount: 0,
      qualityTrend: null,
      holdProgress: 0,
      isHolding: false,
    });
    prevAssessmentRef.current = null;
  }, [stopGuidance]);

  // Expose a way to force ready for E2E tests
  useEffect(() => {
    window.__AFIA_FORCE_READY__ = () => {
      setState(prev => ({ ...prev, isReady: true, goodFramesCount: 10 }));
    };
    return () => {
      delete window.__AFIA_FORCE_READY__;
    };
  }, []);

  /**
   * Cleanup on unmount
  ...
   */
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
  };
}

/**
 * Get color for quality indicator
 */
export function getQualityColor(score: number): string {
  if (score >= 75) return '#10b981'; // Green
  if (score >= 50) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
}

/**
 * Get icon for guidance type
 */
export function getGuidanceIcon(type: 'success' | 'warning' | 'error'): string {
  switch (type) {
    case 'success': return '✓';
    case 'warning': return '⚠';
    case 'error': return '✕';
  }
}
