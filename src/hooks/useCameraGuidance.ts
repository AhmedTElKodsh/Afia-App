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

import { useRef, useState, useCallback, useEffect } from 'react';
import { assessImageQuality, createDebouncedAssessment, type QualityAssessment } from '../utils/cameraQualityAssessment';

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
      case 'success':
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
        
      case 'warning':
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
        
      case 'error':
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
 * Main hook implementation
 */
export function useCameraGuidance(
  config: Partial<CameraGuidanceConfig> = {}
): UseCameraGuidanceReturn {
  // Merge with defaults
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const debouncedAssessmentRef = useRef<ReturnType<typeof createDebouncedAssessment> | null>(null);
  
  const [state, setState] = useState<CameraGuidanceState>({
    assessment: null,
    isReady: false,
    isActive: false,
    goodFramesCount: 0,
    qualityTrend: null,
  });
  
  const prevAssessmentRef = useRef<QualityAssessment | null>(null);
  
  /**
   * Analysis loop
   */
  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      // Video not ready
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    
    // Run assessment
    const assessment = assessImageQuality(video, {
      minBlurScore: mergedConfig.minBlurScore,
      requireGoodLighting: mergedConfig.requireGoodLighting,
    });
    
    // Check for test mode bypass
    // @ts-ignore - Dynamic property for testing
    const isTestMode = window.__AFIA_TEST_MODE__ === true;
    
    // Update state
    setState(prev => {
      const isGood = assessment.isGoodQuality || isTestMode;
      const goodFramesCount = isGood ? prev.goodFramesCount + 1 : 0;
      
      // Determine quality trend
      let qualityTrend: 'improving' | 'stable' | 'declining' | null = null;
      if (prev.assessment) {
        const diff = assessment.overallScore - prev.assessment.overallScore;
        if (diff > 5) qualityTrend = 'improving';
        else if (diff < -5) qualityTrend = 'declining';
        else qualityTrend = 'stable';
      }
      
      // Ready when we have 2+ consecutive good frames (or test mode)
      const isReady = (goodFramesCount >= 2 && isGood) || isTestMode;
      
      // Haptic "Ready" Click - only on the transition to ready
      if (isReady && !prev.isReady && mergedConfig.enableHaptics && navigator.vibrate) {
        navigator.vibrate(40); // Sharp, subtle "click"
      }
      
      return {
        assessment,
        isReady,
        isActive: true,
        goodFramesCount,
        qualityTrend,
      };
    });
    
    // Provide sensory feedback
    provideFeedback(assessment, prevAssessmentRef.current, mergedConfig);
    
    // Store for next comparison
    prevAssessmentRef.current = assessment;
    
    // Continue loop
    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
  }, [mergedConfig]);
  
  /**
   * Start guidance analysis
   */
  const startGuidance = useCallback((videoElement: HTMLVideoElement) => {
    // Stop any existing analysis
    stopGuidance();
    
    videoRef.current = videoElement;
    
    // Create debounced assessment for callback-based updates
    debouncedAssessmentRef.current = createDebouncedAssessment(
      (assessment) => {
        // This is for additional callbacks if needed
        console.log('Quality assessment:', assessment);
      },
      mergedConfig.analysisInterval
    );
    
    // Start analysis loop
    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
  }, [analyzeFrame, mergedConfig.analysisInterval]);
  
  /**
   * Stop guidance analysis
   */
  const stopGuidance = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (debouncedAssessmentRef.current) {
      debouncedAssessmentRef.current.cancel();
      debouncedAssessmentRef.current = null;
    }
    
    videoRef.current = null;
    
    setState(prev => ({
      ...prev,
      isActive: false,
    }));
  }, []);
  
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
    });
    prevAssessmentRef.current = null;
  }, [stopGuidance]);

  // Expose a way to force ready for E2E tests
  useEffect(() => {
    // @ts-ignore
    window.__AFIA_FORCE_READY__ = () => {
      setState(prev => ({ ...prev, isReady: true, goodFramesCount: 10 }));
    };
    return () => {
      // @ts-ignore
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
