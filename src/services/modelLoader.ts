/**
 * TF.js Model Loader with IndexedDB Caching
 * Handles lazy loading and caching of the fill-level regression model
 * Story 7.4 - Task 8: Added error telemetry
 */
import * as tf from '@tensorflow/tfjs';
import { openDB, type IDBPDatabase } from 'idb';
import { logError } from './errorTelemetry.ts';

const MODEL_CONFIG = {
  version: '1.0.0',
  r2BaseUrl: import.meta.env.VITE_MODEL_R2_URL || 'https://pub-models.afia.app',
  modelPath: '/models/fill-regressor/v1.0.0/model.json',
  dbName: 'afia-models',
  storeName: 'models',
  dbVersion: 1,
  versionCheckUrl: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/model/version` : 'https://api.afia.app/model/version',
};

interface ModelCacheEntry {
  version: string;
  modelTopology: unknown;
  weightSpecs: unknown;
  weightData: ArrayBuffer;
  cachedAt: number;
  mae: number;
  trainingCount?: number;
  deployedAt?: string;
  r2Key?: string;
}

let modelInstance: tf.LayersModel | null = null;
let loadingPromise: Promise<tf.LayersModel> | null = null;
let loadedModelVersion: string = MODEL_CONFIG.version;
let activeInferenceCount = 0;

export function getLoadedModelVersion(): string { return loadedModelVersion; }
export function beginInference(): void { activeInferenceCount++; }
export function endInference(): void { activeInferenceCount = Math.max(0, activeInferenceCount - 1); }

/**
 * Open IndexedDB for model caching
 */
async function openModelDB(): Promise<IDBPDatabase> {
  return openDB(MODEL_CONFIG.dbName, MODEL_CONFIG.dbVersion, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(MODEL_CONFIG.storeName)) {
        db.createObjectStore(MODEL_CONFIG.storeName, { keyPath: 'version' });
      }
    },
  });
}

/**
 * Get cached model from IndexedDB
 */
async function getCachedModel(version: string): Promise<ModelCacheEntry | null> {
  try {
    const db = await openModelDB();
    const entry = await db.get(MODEL_CONFIG.storeName, version);
    return entry || null;
  } catch (error) {
    console.warn('[ModelLoader] Failed to read from IndexedDB:', error);
    return null;
  }
}

/**
 * Save model to IndexedDB cache with quota handling
 * Story 7.4 - Task 8: Added quota exceeded error handling
 */
async function setCachedModel(entry: ModelCacheEntry): Promise<void> {
  try {
    const db = await openModelDB();
    await db.put(MODEL_CONFIG.storeName, entry);
    console.log('[ModelLoader] Model cached successfully');
  } catch (error: any) {
    // Handle quota exceeded errors
    if (error?.name === 'QuotaExceededError') {
      console.warn('[ModelLoader] IndexedDB quota exceeded, attempting to clear old versions');
      
      // Log telemetry
      logError('storage', error, {
        operation: 'cache_model',
        modelVersion: entry.version,
      });
      
      try {
        const db = await openModelDB();
        const allEntries = await db.getAll(MODEL_CONFIG.storeName);
        
        // Sort by cachedAt timestamp (oldest first)
        const sortedEntries = allEntries.sort((a, b) => a.cachedAt - b.cachedAt);
        
        // Delete oldest entries (keep only the newest one)
        for (let i = 0; i < sortedEntries.length - 1; i++) {
          await db.delete(MODEL_CONFIG.storeName, sortedEntries[i].version);
          console.log(`[ModelLoader] Deleted old model version: ${sortedEntries[i].version}`);
        }
        
        // Try to cache again after cleanup
        await db.put(MODEL_CONFIG.storeName, entry);
        console.log('[ModelLoader] Model cached successfully after cleanup');
      } catch (cleanupError) {
        console.warn('[ModelLoader] Failed to cache model even after cleanup:', cleanupError);
        // Non-blocking - continue even if cache fails
      }
    } else {
      console.warn('[ModelLoader] Failed to cache model:', error);
      // Non-blocking - continue even if cache fails
    }
  }
}

/**
 * Download model from R2 with retry logic
 * Story 7.4 - Task 8: Added retry logic for network failures
 */
async function downloadModel(url: string, retries = 3): Promise<{
  modelTopology: unknown;
  weightSpecs: unknown;
  weightData: ArrayBuffer;
}> {
  console.log('[ModelLoader] Downloading model from:', url);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Model download failed: HTTP ${response.status}`);
      }

      const modelJson = await response.json();
  
  // Download weight files
  const weightsManifest = modelJson.weightsManifest;
  if (!weightsManifest || weightsManifest.length === 0) {
    throw new Error('Invalid model.json: missing weightsManifest');
  }

  const baseUrl = url.substring(0, url.lastIndexOf('/'));
  const weightBuffers: ArrayBuffer[] = [];
  const weightSpecs: tf.io.WeightsManifestEntry[] = [];

  for (const group of weightsManifest) {
    if (group.weights) {
      weightSpecs.push(...group.weights);
    }
    for (const path of group.paths) {
      const weightUrl = `${baseUrl}/${path}`;
      const weightResponse = await fetch(weightUrl);
      if (!weightResponse.ok) {
        throw new Error(`Weight download failed: ${weightUrl}`);
      }
      weightBuffers.push(await weightResponse.arrayBuffer());
    }
  }

  // Concatenate all weight buffers
  const totalSize = weightBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const weightData = new ArrayBuffer(totalSize);
  const weightView = new Uint8Array(weightData);
  let offset = 0;
  for (const buf of weightBuffers) {
    weightView.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs,
        weightData,
      };
    } catch (error) {
      lastError = error as Error;
      console.warn(`[ModelLoader] Download attempt ${attempt}/${retries} failed:`, error);
      
      // Log error telemetry
      logError('network', lastError, {
        attempt,
        maxRetries: retries,
        url,
      });
      
      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`Model download failed after ${retries} retries: ${lastError?.message}`);
}

/**
 * Load model from cache or download from R2
 * Story 7.4 - Task 7: Added WebGL backend optimization
 */
export async function loadModel(
  onProgress?: (message: string) => void
): Promise<tf.LayersModel> {
  // Return existing instance if already loaded
  if (modelInstance) {
    return modelInstance;
  }

  // Return existing loading promise if already in progress
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Story 7.4 - Task 7: Try to use WebGL backend for better performance
      await optimizeBackend();
      
      // Try cache first
      onProgress?.('Checking cache...');
      const cached = await getCachedModel(MODEL_CONFIG.version);

      let modelData: {
        modelTopology: unknown;
        weightSpecs: unknown;
        weightData: ArrayBuffer;
      };

      if (cached) {
        console.log('[ModelLoader] Loading from IndexedDB cache');
        onProgress?.('Loading from cache...');
        modelData = {
          modelTopology: cached.modelTopology,
          weightSpecs: cached.weightSpecs,
          weightData: cached.weightData,
        };
      } else {
        console.log('[ModelLoader] Cache miss, downloading from R2');
        onProgress?.('Downloading model (~5MB)...');
        
        const modelUrl = `${MODEL_CONFIG.r2BaseUrl}${MODEL_CONFIG.modelPath}`;
        modelData = await downloadModel(modelUrl);

        // Cache for next time (non-blocking)
        setCachedModel({
          version: MODEL_CONFIG.version,
          modelTopology: modelData.modelTopology,
          weightSpecs: modelData.weightSpecs,
          weightData: modelData.weightData,
          cachedAt: Date.now(),
          mae: 0.08, // From training (Story 7.3)
        }).catch(err => console.warn('[ModelLoader] Cache save failed:', err));
      }

      // Load model into TF.js
      onProgress?.('Initializing model...');
      
      let model: tf.LayersModel;
      try {
        model = await tf.loadLayersModel(
          tf.io.fromMemory(
            modelData.modelTopology as tf.io.ModelJSON,
            modelData.weightSpecs as tf.io.WeightsManifestEntry[],
            modelData.weightData
          )
        );
      } catch (parseError) {
        // Story 7.4 - Task 8: Handle corrupt model data
        console.error('[ModelLoader] Model parse error, clearing cache:', parseError);
        
        // Log telemetry
        logError('model_loading', parseError as Error, {
          modelVersion: MODEL_CONFIG.version,
          fromCache: !!cached,
        });
        
        // Clear corrupted cache entry
        if (cached) {
          try {
            const db = await openModelDB();
            await db.delete(MODEL_CONFIG.storeName, MODEL_CONFIG.version);
            console.log('[ModelLoader] Cleared corrupted cache entry');
          } catch (deleteError) {
            console.warn('[ModelLoader] Failed to clear cache:', deleteError);
          }
        }
        
        throw new Error(`Model parse failed: ${(parseError as Error).message}`);
      }

      modelInstance = model;
      loadedModelVersion = MODEL_CONFIG.version;
      console.log('[ModelLoader] Model loaded successfully on backend:', tf.getBackend());
      return model;
    } catch (error) {
      loadingPromise = null; // Reset so retry is possible
      
      // Log telemetry
      logError('model_loading', error as Error, {
        modelVersion: MODEL_CONFIG.version,
        backend: tf.getBackend(),
      });
      
      throw error;
    }
  })();

  return loadingPromise;
}

/**
 * Story 7.4 - Task 7: Optimize TF.js backend for performance
 * Tries to use WebGL backend for GPU acceleration
 */
async function optimizeBackend(): Promise<void> {
  try {
    const currentBackend = tf.getBackend();
    console.log('[ModelLoader] Current backend:', currentBackend);
    
    // Try to set WebGL backend for GPU acceleration
    if (currentBackend !== 'webgl') {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('[ModelLoader] Switched to WebGL backend for GPU acceleration');
    }
  } catch (error) {
    console.warn('[ModelLoader] WebGL backend not available, using fallback:', error);
    // Fall back to CPU backend
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('[ModelLoader] Using CPU backend');
    } catch (cpuError) {
      console.error('[ModelLoader] Failed to set any backend:', cpuError);
    }
  }
}

/**
 * Check if model is already loaded
 */
export function isModelLoaded(): boolean {
  return modelInstance !== null;
}

/**
 * Get model instance (throws if not loaded)
 */
export function getModel(): tf.LayersModel {
  if (!modelInstance) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }
  return modelInstance;
}

/**
 * Clear model from memory (for cleanup)
 */
export function disposeModel(): void {
  if (modelInstance) {
    modelInstance.dispose();
    modelInstance = null;
    loadingPromise = null;
    console.log('[ModelLoader] Model disposed');
  }
}

/**
 * Story 7.5 - Task 2: Check for new model version
 * Compares server version with cached version and triggers update if needed
 */
export async function checkModelVersion(): Promise<{
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  updateTriggered: boolean;
}> {
  try {
    console.log('[ModelLoader] Checking for model updates...');
    
    // Fetch latest version from server
    const response = await fetch(MODEL_CONFIG.versionCheckUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.warn('[ModelLoader] Version check failed:', response.status);
      return {
        updateAvailable: false,
        currentVersion: MODEL_CONFIG.version,
        latestVersion: MODEL_CONFIG.version,
        updateTriggered: false,
      };
    }

    const serverVersion = await response.json();
    
    // Get cached version from IndexedDB
    const db = await openModelDB();
    const allEntries = await db.getAll(MODEL_CONFIG.storeName);
    const cachedVersion = allEntries.length > 0 
      ? allEntries.sort((a, b) => b.cachedAt - a.cachedAt)[0].version
      : null;

    const currentVersion = cachedVersion || MODEL_CONFIG.version;
    const latestVersion = serverVersion.version;

    console.log('[ModelLoader] Version check:', {
      current: currentVersion,
      latest: latestVersion,
      cached: !!cachedVersion,
    });

    // Check if update is needed
    if (latestVersion !== currentVersion) {
      console.log('[ModelLoader] New version available, triggering background update');
      
      // Trigger background update (non-blocking)
      updateModelInBackground(serverVersion).catch(err => {
        console.error('[ModelLoader] Background update failed:', err);
        logError('model_update', err, {
          fromVersion: currentVersion,
          toVersion: latestVersion,
        });
      });

      return {
        updateAvailable: true,
        currentVersion,
        latestVersion,
        updateTriggered: true,
      };
    }

    return {
      updateAvailable: false,
      currentVersion,
      latestVersion,
      updateTriggered: false,
    };
  } catch (error) {
    console.warn('[ModelLoader] Version check error:', error);
    
    // Log telemetry
    logError('version_check', error as Error, {
      currentVersion: MODEL_CONFIG.version,
    });

    return {
      updateAvailable: false,
      currentVersion: MODEL_CONFIG.version,
      latestVersion: MODEL_CONFIG.version,
      updateTriggered: false,
    };
  }
}

/**
 * Story 7.5 - Task 2: Update model in background
 * Downloads new model version and updates IndexedDB cache
 */
async function updateModelInBackground(serverVersion: {
  version: string;
  mae: number;
  trainingCount: number;
  r2Key: string;
  deployedAt: string;
}): Promise<void> {
  try {
    console.log('[ModelLoader] Starting background model update to', serverVersion.version);
    
    // Construct model URL from R2 key
    const modelUrl = `${MODEL_CONFIG.r2BaseUrl}/${serverVersion.r2Key}`;
    
    // Download new model
    const modelData = await downloadModel(modelUrl);
    
    // Save to IndexedDB
    await setCachedModel({
      version: serverVersion.version,
      modelTopology: modelData.modelTopology,
      weightSpecs: modelData.weightSpecs,
      weightData: modelData.weightData,
      cachedAt: Date.now(),
      mae: serverVersion.mae,
      trainingCount: serverVersion.trainingCount,
      deployedAt: serverVersion.deployedAt,
      r2Key: serverVersion.r2Key,
    });
    
    // Verify save was successful before deleting old versions
    const db = await openModelDB();
    const allEntries = await db.getAll(MODEL_CONFIG.storeName);
    const newVersionExists = allEntries.some(e => e.version === serverVersion.version);

    if (newVersionExists) {
      console.log('[ModelLoader] New version confirmed in cache, cleaning up old versions');
      const oldEntries = allEntries.filter(e => e.version !== serverVersion.version);
      
      for (const oldEntry of oldEntries) {
        try {
          await db.delete(MODEL_CONFIG.storeName, oldEntry.version);
          console.log('[ModelLoader] Deleted old model version:', oldEntry.version);
        } catch (deleteError) {
          console.warn(`[ModelLoader] Failed to delete old version ${oldEntry.version}:`, deleteError);
        }
      }
    } else {
      console.warn('[ModelLoader] New version not found in cache after save attempt, skipping cleanup');
    }
    
    // Defer disposal until any running inference completes
    const oldModel = modelInstance;
    modelInstance = null;
    loadingPromise = null;
    loadedModelVersion = serverVersion.version;

    const deferDispose = (m: tf.LayersModel, attempts = 0) => {
      const MAX_ATTEMPTS = 100; // 5 seconds total (reduced from 10s to prevent memory buildup)
      if (activeInferenceCount > 0 && attempts < MAX_ATTEMPTS) {
        setTimeout(() => deferDispose(m, attempts + 1), 50);
      } else {
        if (attempts >= MAX_ATTEMPTS) {
          console.warn('[ModelLoader] Forced model disposal after 5s - active inference may be stuck');
          // Log telemetry for stuck inference
          logError('model_loading', new Error('Forced disposal - inference timeout'), {
            activeInferenceCount,
            modelVersion: serverVersion.version,
          });
        }
        m.dispose();
        console.log('[ModelLoader] Old model instance disposed after inference drained');
      }
    };
    if (oldModel) deferDispose(oldModel);

    console.log('[ModelLoader] Model updated successfully to', serverVersion.version);
    
    // Show notification to user
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Model Updated', {
        body: `AFIA model updated to v${serverVersion.version}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    }
  } catch (error) {
    console.error('[ModelLoader] Background update failed:', error);
    throw error;
  }
}

