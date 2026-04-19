/**
 * Analysis Router
 * Orchestrates local model inference with LLM fallback
 * Story 7.6 - Integrated routing decision logic
 * Story 7.8 - Quality pre-check and background sync integration
 */
import { loadModel, isModelLoaded } from './modelLoader';
import { runLocalInference } from './localInference';
import { analyzeBottle } from '../api/apiClient';
import { routeInference } from './inferenceRouter';
import { isIOS, isWebGLAvailable } from '../utils/platformDetect';
import { analyzeImageQuality, checkUploadQuality, type ImageQualitySignals } from './uploadFilter';
import { enqueueAnalyzeRequest } from './syncQueue';
import { getBottleBySku } from '../data/bottleRegistry';
import { calculateRemainingMl } from '../utils/volumeCalculator';
import type { AnalysisResult } from '../state/appState';

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

/**
 * Main analysis entry point with smart routing
 * Story 7.6 - Task 2: Integrated routing decision logic
 * Story 7.8 - Task 1: Quality pre-check integration
 */
export async function analyze(options: AnalysisOptions): Promise<AnalysisResult> {
  const { sku, imageBase64, totalVolumeMl, brandClassifierConfidence, bottleDetectionConfidence, onProgress, onQualityWarning } = options;
  
  // Story 7.4 - Task 8: Wrap progress callback to prevent errors from breaking flow
  const safeProgress = (message: string) => {
    if (onProgress) {
      try {
        onProgress(message);
      } catch (error) {
        console.warn('[AnalysisRouter] Progress callback error:', error);
        // Continue execution - callback errors should not break analysis
      }
    }
  };
  
  // Story 7.8 - AC1: Quality pre-check before upload
  try {
    safeProgress('Checking image quality...');
    const qualityMetrics = await analyzeImageQuality(imageBase64);
    const qualitySignals: ImageQualitySignals = {
      ...qualityMetrics,
      bottleDetectionConfidence: bottleDetectionConfidence ?? null,
    };
    
    const qualityCheck = checkUploadQuality(qualitySignals);
    
    if (qualityCheck.shouldWarn && onQualityWarning) {
      console.log('[AnalysisRouter] Quality warning:', qualityCheck.reasons);
      const shouldContinue = await onQualityWarning(qualityCheck.reasons);
      
      if (!shouldContinue) {
        throw new Error('USER_CANCELLED: User chose to retake photo');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('USER_CANCELLED:')) {
      throw error;
    }
    // Quality check failed - log but continue (don't block analysis)
    console.warn('[AnalysisRouter] Quality check failed:', error);
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
      if (isOffline) {
        throw new Error('Model not available offline. Please connect to download the AI model.');
      }
      safeProgress('Loading AI model...');
      await loadModel(safeProgress);
    }
    
    // Step 2: Run local inference
    safeProgress(isOffline ? 'Analyzing offline...' : 'Analyzing locally...');
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
      const remainingMl = bottle
        ? Math.round(calculateRemainingMl(inference.fillPercentage, bottle.totalVolumeMl, bottle.geometry))
        : Math.round((inference.fillPercentage / 100) * totalVolumeMl);
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
        : Math.round((inference.fillPercentage / 100) * totalVolumeMl);
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
    safeProgress('Verifying with cloud AI...');
    
  } catch (error) {
    // Model loading or inference failed
    if (isOffline) {
      throw new Error('Cannot analyze offline without cached model. Please connect to internet.');
    }
    
    // Check if it's the NEEDS_SKU error
    if (error instanceof Error && error.message.startsWith('NEEDS_SKU:')) {
      throw error;
    }
    
    console.warn('[AnalysisRouter] Local inference failed, falling back to LLM:', error);
    safeProgress('Analyzing...');
  }
  
  // Step 4: LLM fallback (AC2, AC5)
  try {
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
    const isNetworkError = error instanceof Error && (
      error.name === 'TypeError' || // fetch throws TypeError on network failure
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('offline')
    );
    const isOfflineNow = !navigator.onLine;
    if (isNetworkError || isOfflineNow) {
      console.log('[AnalysisRouter] Network error detected, enqueueing for background sync');
      
      try {
        await enqueueAnalyzeRequest({ sku, imageBase64 });
        
        // Return a special result indicating queued state
        return {
          scanId: `queued-${Date.now()}`,
          fillPercentage: localResult?.fillPercentage ? Math.round(localResult.fillPercentage) : 0,
          remainingMl: localResult ? Math.round((localResult.fillPercentage / 100) * totalVolumeMl) : 0,
          confidence: 'low',
          aiProvider: 'queued',
          latencyMs: 0,
          localModelResult: localResult ?? undefined,
          llmFallbackUsed: false,
          queuedForSync: true,
        };
      } catch (queueError) {
        console.error('[AnalysisRouter] Failed to enqueue request:', queueError);
        throw error; // Re-throw original error if queueing fails
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
    import('./errorTelemetry').then(({ logError }) => {
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

    console.log(`[AnalysisRouter] Migrating ${queue.length} legacy localStorage scans to IndexedDB`);
    
    // Move all items to IndexedDB immediately and clear localStorage
    for (const item of queue) {
      try {
        await enqueueAnalyzeRequest({ sku: item.sku, imageBase64: item.imageBase64 });
      } catch (e) {
        console.error('[AnalysisRouter] Failed to migrate item to IndexedDB:', e);
      }
    }
    
    localStorage.removeItem('afia_offline_queue');
    console.log('[AnalysisRouter] Legacy offline queue migrated to IndexedDB and cleared from localStorage');
  } catch (error) {
    console.warn('[AnalysisRouter] Failed to process offline queue:', error);
  }
}
