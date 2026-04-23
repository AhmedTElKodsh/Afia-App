/**
 * Camera Quality Assessment Utilities
 * Decomposed into modular sub-services for better maintainability.
 */

import { detectBlur } from './camera/blurDetection.ts';
import { assessLighting, type LightingAssessment } from './camera/lightingAssessment.ts';
import { analyzeComposition, verifyBrandAfia, type CompositionAssessment } from './camera/compositionAnalysis.ts';
import { generateGuidanceMessage } from './camera/guidanceGenerator.ts';

export type { LightingAssessment, CompositionAssessment };

export interface QualityAssessment {
  overallScore: number;
  blurScore: number;
  lighting: LightingAssessment;
  composition: CompositionAssessment;
  isGoodQuality: boolean;
  guidanceMessage: string;
  guidanceType: 'success' | 'warning' | 'error';
}

export function assessImageQuality(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  options: {
    minBlurScore?: number;
    requireGoodLighting?: boolean;
    precomputedBlurScore?: number;
  } = {}
): QualityAssessment {
  const { minBlurScore = 50, requireGoodLighting = true, precomputedBlurScore } = options;

  const _runAssessment = (): QualityAssessment => {
    const blurScore = precomputedBlurScore !== undefined ? precomputedBlurScore : detectBlur(imageSource);
    const lighting = assessLighting(imageSource);
    const composition = analyzeComposition(imageSource);
    
    const compositionScore = composition.distance === 'good' ? 100 : (composition.distance === 'too-far' || composition.distance === 'too-close' ? 40 : 0);
    const overallScore = Math.round(blurScore * 0.4 + (lighting.isAcceptable ? 100 : 50) * 0.2 + compositionScore * 0.4);

    const isGoodQuality = blurScore >= minBlurScore && (!requireGoodLighting || lighting.isAcceptable) && composition.bottleDetected && composition.distance === 'good';
    const { message, type } = generateGuidanceMessage(blurScore, lighting, composition);
    
    return { overallScore, blurScore: Math.round(blurScore), lighting, composition, isGoodQuality, guidanceMessage: message, guidanceType: type };
  };

  if (import.meta.env.DEV) {
    const t0 = performance.now();
    const result = _runAssessment();
    const elapsed = performance.now() - t0;
    if (elapsed > 6) console.warn(`[camera] assessment took ${elapsed.toFixed(1)}ms`);
    return result;
  }
  return _runAssessment();
}

export function createDebouncedAssessment(callback: (assessment: QualityAssessment) => void, intervalMs: number = 500) {
  let lastCall = 0, timeoutId: number | null = null;
  return {
    processFrame(video: HTMLVideoElement) {
      const now = Date.now();
      if (now - lastCall >= intervalMs) {
        lastCall = now; callback(assessImageQuality(video));
      } else if (!timeoutId) {
        timeoutId = window.setTimeout(() => { timeoutId = null; lastCall = Date.now(); callback(assessImageQuality(video)); }, intervalMs - (now - lastCall));
      }
    },
    cancel() { if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } },
  };
}

export { detectBlur, assessLighting, analyzeComposition, verifyBrandAfia, generateGuidanceMessage };

/**
 * Device orientation guidance.
 */
export function getAngleGuidance(beta: number | null): 'good' | 'tilt-up' | 'tilt-down' {
  if (beta === null) return 'good';
  const targetAngle = 90, tolerance = 10;
  if (beta < targetAngle - tolerance) return 'tilt-up';
  if (beta > targetAngle + tolerance) return 'tilt-down';
  return 'good';
}
