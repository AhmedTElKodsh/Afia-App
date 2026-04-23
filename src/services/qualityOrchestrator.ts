import i18next from 'i18next';
import { analyzeImageQuality, checkUploadQuality, type ImageQualitySignals } from './uploadFilter.ts';

export interface QualityCheckResult {
  passed: boolean;
  reasons: string[];
  translatedReasons: string[];
  shouldWarn: boolean;
}

/**
 * Orchestrates image quality pre-checks
 * Story 7.8 - AC1: Quality pre-check before upload
 */
export async function runQualityCheck(
  imageBase64: string, 
  bottleDetectionConfidence: number | null,
  isTestMode: boolean
): Promise<QualityCheckResult> {
  try {
    // Support testing override for quality check
    const overrideQualityFn =
      typeof window !== 'undefined'
        ? (window as { analyzeImageQuality?: typeof analyzeImageQuality }).analyzeImageQuality
        : undefined;
    const qualityFn = overrideQualityFn || analyzeImageQuality;
    const qualityMetrics = await qualityFn(imageBase64);

    // `analyzeImageQuality` returns `{ blurScore, brightnessScore }`.
    // Fail-safe defaults must match `ImageQualitySignals` exactly.
    const safeMetrics =
      qualityMetrics &&
      typeof qualityMetrics === "object" &&
      typeof (qualityMetrics as { blurScore?: unknown }).blurScore === "number" &&
      typeof (qualityMetrics as { brightnessScore?: unknown }).brightnessScore === "number"
        ? (qualityMetrics as { blurScore: number; brightnessScore: number })
        : { blurScore: 1, brightnessScore: 0.5 };

    const qualitySignals: ImageQualitySignals = {
      blurScore: safeMetrics.blurScore,
      brightnessScore: safeMetrics.brightnessScore,
      bottleDetectionConfidence,
    };
    
    const qualityCheck = checkUploadQuality(qualitySignals);
    
    return {
      passed: !qualityCheck.shouldWarn,
      reasons: qualityCheck.reasons,
      translatedReasons: qualityCheck.reasons.map(key => i18next.t(key, key)),
      shouldWarn: qualityCheck.shouldWarn && !isTestMode
    };
  } catch (error) {
    console.warn('[QualityOrchestrator] Quality check failed (non-blocking):', error);
    return {
      passed: true, // Fail-open
      reasons: [],
      translatedReasons: [],
      shouldWarn: false
    };
  }
}
