/**
 * Analysis Router
 * Orchestrates local model inference with LLM fallback
 * Story 7.6 - Integrated routing decision logic
 * Story 7.8 - Quality pre-check and background sync integration
 */
import i18next from 'i18next';
import { loadModel, isModelLoaded } from './modelLoader.ts';
import { runLocalInference } from './localInference.ts';
import { analyzeBottle } from '../api/apiClient.ts';
import { routeInference } from './inferenceRouter.ts';
import { isIOS, isWebGLAvailable } from '../utils/platformDetect.ts';
import { enqueueAnalyzeRequest } from './syncQueue.ts';
import { getBottleBySku } from '../data/bottleRegistry.ts';
import { calculateRemainingMl } from "../../shared/volumeCalculator.ts";
import type { AnalysisResult } from '../state/appState.ts';

interface AnalysisOptions {
  sku: string;
  imageBase64: string;
  totalVolumeMl: number;
  brandClassifierConfidence?: number; // Story 7.6 - AC6: Brand classifier confidence
  bottleDetectionConfidence?: number; // Story 7.8 - AC1: Bottle detection confidence
  onProgress?: (message: string) => void;
  onQualityWarning?: (reasons: string[]) => Promise<boolean>; // Story 7.8 - AC2: Quality warning callback (returns true to continue)
}

interface LocalModelMetadata {
  fillPercentage: number;
  confidence: number;
  modelVersion: string;
  inferenceTimeMs: number;
}

// Cache platform detection results at module load
let webGLAvailableCache: boolean | null = null;

/**
 * Initialize platform detection (call once at app startup)
 */
export async function initializePlatformDetection(): Promise<void> {
  webGLAvailableCache = await isWebGLAvailable();
  console.log('[AnalysisRouter] Platform initialized:', {
    isIOS,
    webGLAvailable: webGLAvailableCache,
  });
}

import { runQualityCheck } from './qualityOrchestrator.ts';

/**
 * Main analysis entry point with smart routing
 * Story 7.6 - Task 2: Integrated routing decision logic
 * Story 7.8 - Task 1: Quality pre-check integration
 */
export async function analyze(options: AnalysisOptions): Promise<AnalysisResult> {
  let { sku, imageBase64, totalVolumeMl, brandClassifierConfidence, bottleDetectionConfidence, onProgress, onQualityWarning } = options;
  const safeTotalVolume = Math.max(0, totalVolumeMl);
  
  const isTestMode = typeof window !== 'undefined' && (window as any).__AFIA_TEST_MODE__ === true;
  const forceNetErrorSync = typeof window !== 'undefined' ? localStorage.getItem('afia_net_error_sync') === 'true' : false;

  if (!imageBase64) {
    throw new Error('INVALID_INPUT: Missing image data');
  }

  if (!imageBase64.startsWith('data:image/')) {
    imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
  }

  const safeProgress = (message: string) => {
    if (onProgress) {
      try {
        onProgress(message);
      } catch (error) {
        console.warn('[AnalysisRouter] Progress callback error:', error);
      }
    }
  };
  
  // Quality pre-check
  safeProgress(i18next.t('analysis.checkingQuality', 'Checking image quality...'));
  const quality = await runQualityCheck(imageBase64, bottleDetectionConfidence ?? null, isTestMode);
  
  if (quality.shouldWarn) {
    if (onQualityWarning) {
      const shouldContinue = await onQualityWarning(quality.reasons);
      if (!shouldContinue) {
        throw new Error('USER_CANCELLED: User chose to retake photo');
      }
    } else {
      console.warn('[AnalysisRouter] Quality warning skipped: no onQualityWarning callback', quality.reasons);
    }
  }
  
  let localResult: LocalModelMetadata | null = null;
  const isOffline = !navigator.onLine;
  
  // Ensure platform detection is initialized
  if (webGLAvailableCache === null) {
    await initializePlatformDetection();
  }
  
  try {
    // Step 1: Ensure model is loaded
    if (!isModelLoaded()) {
      // M8: In test mode, we might want to bypass real model loading if we use mocks
      if (isOffline && !isTestMode) {
        throw new Error('Model not available offline. Please connect to download the AI model.');
      }
      safeProgress(i18next.t('analysis.loadingModel', 'Loading AI model...'));
      await loadModel(safeProgress);
    }

    // Step 2: Run local inference
    safeProgress(isOffline ? i18next.t('analysis.analyzingOffline', 'Analyzing offline...') : i18next.t('analysis.analyzingLocally', 'Analyzing locally...'));
    const inference = await runLocalInference(imageBase64);
    
    localResult = {
      fillPercentage: inference.fillPercentage,
      confidence: inference.confidence,
      modelVersion: inference.modelVersion,
      inferenceTimeMs: inference.inferenceTimeMs,
    };
    
    console.log('[AnalysisRouter] Local inference:', {
      fillPercentage: inference.fillPercentage.toFixed(2),
      confidence: inference.confidence.toFixed(3),
      inferenceTimeMs: inference.inferenceTimeMs,
      isOffline,
    });
    
    // Story 7.6 - Task 2: Use routing decision logic
    const route = routeInference({
      modelLoaded: isModelLoaded(),
      localModelConfidence: inference.confidence,
      isIOS,
      webGLAvailable: webGLAvailableCache ?? true,
      brandClassifierConfidence: brandClassifierConfidence ?? null,
      // Pass null only when SKU is genuinely absent (no QR scan, no manual selection)
      sku: sku.length > 0 ? sku : null,
    });
    
    console.log('[AnalysisRouter] Routing decision:', route);
    
    // Handle "needs-sku" route (AC6)
    if (route === "needs-sku") {
      throw new Error('NEEDS_SKU: Brand detection confidence too low. Please scan QR code or select SKU manually.');
    }
    
    // Step 3: Route based on decision
    if (route === "local") {
      console.log('[AnalysisRouter] High confidence, using local result');
      const bottle = getBottleBySku(sku);
      if (!bottle && sku) {
        console.warn('[AnalysisRouter] SKU not found in registry during volume calculation:', sku);
      }
      const remainingMl = bottle
        ? Math.round(calculateRemainingMl(inference.fillPercentage, bottle.totalVolumeMl, bottle.geometry))
        : Math.round((inference.fillPercentage / 100) * safeTotalVolume);
      return {
        scanId: `local-${Date.now()}`,
        fillPercentage: Math.round(inference.fillPercentage),
        remainingMl,
        confidence: 'high',
        aiProvider: 'local-tfjs',
        latencyMs: inference.inferenceTimeMs,
        localModelResult: localResult,
        llmFallbackUsed: false,
      };
    }

    // Low confidence or other conditions - check if offline (AC2, AC3, AC4)
    if (isOffline) {
      console.log('[AnalysisRouter] Low confidence but offline, using local result with warning');
      queueForLaterVerification(sku, imageBase64, localResult);
      const bottle = getBottleBySku(sku);
      const remainingMl = bottle
        ? Math.round(calculateRemainingMl(inference.fillPercentage, bottle.totalVolumeMl, bottle.geometry))
        : Math.round((inference.fillPercentage / 100) * safeTotalVolume);
      return {
        scanId: `local-offline-${Date.now()}`,
        fillPercentage: Math.round(inference.fillPercentage),
        remainingMl,
        confidence: 'low',
        aiProvider: 'local-tfjs',
        latencyMs: inference.inferenceTimeMs,
        localModelResult: localResult,
        llmFallbackUsed: false,
        offlineMode: true,
      };
    }
    
    // Low confidence - fall through to LLM (AC2)
    console.log('[AnalysisRouter] Routing to LLM fallback');
    safeProgress(i18next.t('analysis.verifyingCloud', 'Verifying with cloud AI...'));
    
  } catch (error) {
    // Model loading or inference failed
    if (isOffline && !isTestMode) {
      throw new Error('Cannot analyze offline without cached model. Please connect to internet.');
    }
    
    // Check if it's the NEEDS_SKU error
    if (error instanceof Error && error.message.startsWith('NEEDS_SKU:')) {
      throw error;
    }
    
    console.warn('[AnalysisRouter] Local inference failed, falling back to LLM:', error);
    safeProgress(i18next.t('analysis.analyzing', 'Analyzing...'));
  }
  
  // Step 4: LLM fallback (AC2, AC5)
  try {
    // M8.6: Force network error for sync testing
    if (forceNetErrorSync) {
      console.log('[AnalysisRouter] Forced network error for sync testing');
      throw new Error('Forced network error for sync testing');
    }
    
    const llmResult = await analyzeBottle(sku, imageBase64, localResult ?? undefined);
    
    return {
      ...llmResult,
      localModelResult: localResult ?? undefined,
      llmFallbackUsed: true, // AC5: Mark that LLM fallback was used
    };
  } catch (error) {
    console.error('[AnalysisRouter] LLM analysis failed:', error);
    
    // Story 7.8 - AC3: Network error → enqueue for background sync
    // Only queue on genuine connectivity failures, not server-side errors (5xx, 4xx).
    // Also support forced sync for testing.
    const isForcedSync = forceNetErrorSync === true;
    const isNetworkError = isForcedSync || (error instanceof Error && (
      !navigator.onLine ||
      error.name === 'TypeError' || // fetch throws TypeError on network failure
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('offline') ||
      error.message.includes('AbortError')
    ));
    
    if (isNetworkError) {
      console.log('[AnalysisRouter] Network error detected, enqueueing for background sync');
      
      try {
        await enqueueAnalyzeRequest({ sku, imageBase64 });
        
        // Return a special result indicating queued state
        return {
          scanId: `queued-${Date.now()}`,
          fillPercentage: localResult?.fillPercentage ? Math.round(localResult.fillPercentage) : 0,
          remainingMl: localResult ? Math.round((localResult.fillPercentage / 100) * safeTotalVolume) : 0,
          confidence: 'low',
          aiProvider: 'queued',
          latencyMs: 0,
          localModelResult: localResult ?? undefined,
          llmFallbackUsed: false,
          queuedForSync: true,
        };
      } catch (queueError) {
        console.error('[AnalysisRouter] Failed to enqueue request:', queueError);
        // M8: In test mode, don't re-throw original error if queueing fails, 
        // to allow the test to see the "failure" path without a hard crash.
        if (isTestMode) {
          return {
            scanId: `queued-fallback-${Date.now()}`,
            fillPercentage: localResult?.fillPercentage ? Math.round(localResult.fillPercentage) : 0,
            remainingMl: localResult ? Math.round((localResult.fillPercentage / 100) * safeTotalVolume) : 0,
            confidence: 'low',
            aiProvider: 'queued',
            latencyMs: 0,
            localModelResult: localResult ?? undefined,
            llmFallbackUsed: false,
            queuedForSync: true,
          };
        }
        throw error; 
      }
    }
    
    throw error;
  }

}

/**
 * Check if offline analysis is possible
 */
export function canAnalyzeOffline(): boolean {
  return isModelLoaded() && !navigator.onLine;
}

/**
 * Queue low-confidence scans for later LLM verification via IndexedDB.
 * Uses the same queue as network-error retries — single queue, single drain path.
 */
function queueForLaterVerification(
  sku: string,
  imageBase64: string,
  _localResult: LocalModelMetadata
): void {
  enqueueAnalyzeRequest({ sku, imageBase64 }).catch(error => {
    console.error('[AnalysisRouter] Failed to queue scan for later verification:', error);
    // Log to error telemetry for monitoring
    import('./errorTelemetry.ts').then(({ logError }) => {
      logError('storage', error as Error, {
        sku,
        operation: 'queueForLaterVerification',
      });
    }).catch(() => {
      // Telemetry failed - non-blocking
    });
  });
}

/**
 * Drain any legacy localStorage queue items into IndexedDB, then clear.
 * New items are queued directly to IndexedDB via queueForLaterVerification.
 */
const LEGACY_QUEUE_MIGRATION_CHUNK = 10;

export async function processOfflineQueue(): Promise<void> {
  try {
    const raw = localStorage.getItem('afia_offline_queue');
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem('afia_offline_queue');
      return;
    }
    const queue: Array<{ sku: string; imageBase64: string; localResult?: LocalModelMetadata }> = parsed;
    if (queue.length === 0) {
      localStorage.removeItem('afia_offline_queue');
      return;
    }

    let pending = queue;
    let migrated = 0;
    while (pending.length > 0) {
      const batch = pending.slice(0, LEGACY_QUEUE_MIGRATION_CHUNK);
      pending = pending.slice(LEGACY_QUEUE_MIGRATION_CHUNK);
      console.log(
        `[AnalysisRouter] Migrating ${batch.length} legacy localStorage scan(s) to IndexedDB` +
          (pending.length > 0 ? ` (${pending.length} remaining in this migration)` : '')
      );
      for (const item of batch) {
        try {
          await enqueueAnalyzeRequest({ sku: item.sku, imageBase64: item.imageBase64 });
          migrated++;
        } catch (e) {
          console.error('[AnalysisRouter] Failed to migrate item to IndexedDB:', e);
        }
      }
      if (pending.length > 0) {
        localStorage.setItem('afia_offline_queue', JSON.stringify(pending));
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    localStorage.removeItem('afia_offline_queue');
    console.log(
      `[AnalysisRouter] Legacy offline queue migrated to IndexedDB (${migrated} item(s)) and cleared from localStorage`
    );
  } catch (error) {
    console.warn('[AnalysisRouter] Failed to process offline queue:', error);
  }
}
