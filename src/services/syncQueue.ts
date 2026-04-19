/**
 * Background Sync Queue
 * Story 7.8 - Service Worker Smart Upload Filtering
 * 
 * Manages queuing and retry of failed /analyze requests using IndexedDB.
 * Integrates with Background Sync API where available (not on iOS Safari).
 */

import { openDB, type IDBPDatabase } from 'idb';

const WORKER_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:8787';
const DB_NAME = 'afia-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';
const MAX_RETRIES = 5;

export interface AnalyzeRequest {
  sku: string;
  imageBase64: string;
  bottleName?: string;
}

export interface SyncQueueItem {
  id: string;
  payload: AnalyzeRequest;
  enqueuedAt: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Initialize IndexedDB connection
 */
async function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    // Clear cached promise on failure so next call retries
    }).catch(e => { dbPromise = null; throw e; });
  }
  return dbPromise;
}

/**
 * Generate a unique ID for queue items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if Background Sync API is available
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Enqueue an analyze request for background retry
 * 
 * @param payload - The analyze request payload
 * @returns Promise resolving to the queue item ID
 */
const MAX_QUEUE_IMAGE_SIZE = 5_500_000; // ~4MB binary in base64

export async function enqueueAnalyzeRequest(payload: AnalyzeRequest): Promise<string> {
  if (payload.imageBase64.length > MAX_QUEUE_IMAGE_SIZE) {
    throw new Error('Image too large to queue for background sync');
  }
  const db = await getDB();
  
  const item: SyncQueueItem = {
    id: generateId(),
    payload,
    enqueuedAt: Date.now(),
    retryCount: 0,
    maxRetries: MAX_RETRIES,
  };
  
  await db.put(STORE_NAME, item);
  
  // Register background sync if supported
  if (isBackgroundSyncSupported()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as unknown as { sync: { register(tag: string): Promise<void> } }).sync.register('analyze-sync');
    } catch (error) {
      console.warn('Background sync registration failed:', error);
    }
  }
  
  return item.id;
}

/**
 * Get all items in the sync queue
 */
export async function getAllQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * Get the number of items in the queue
 */
export async function getQueueLength(): Promise<number> {
  const db = await getDB();
  const count = await db.count(STORE_NAME);
  return count;
}

/**
 * Remove an item from the queue
 */
export async function removeQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Update an item in the queue
 */
export async function updateQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, item);
}

let isProcessingSyncQueue = false;

/**
 * Process the sync queue - retry all pending items
 *
 * @returns Promise resolving to results summary
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  removed: number;
}> {
  if (isProcessingSyncQueue) return { processed: 0, succeeded: 0, failed: 0, removed: 0 };
  isProcessingSyncQueue = true;
  try {
  const items = await getAllQueueItems();

  const results = {
    processed: items.length,
    succeeded: 0,
    failed: 0,
    removed: 0,
  };
  
  for (const item of items) {
    try {
      // Attempt to send the request
      const response = await fetch(`${WORKER_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      
      if (response.ok) {
        // Success - remove from queue
        try {
          await removeQueueItem(item.id);
          results.removed++;
        } catch (dbError) {
          console.error(`Failed to remove item ${item.id} from queue:`, dbError);
        }
        
        results.succeeded++;

        // Dispatch custom event for UI updates
        let responseData: unknown;
        try { responseData = await response.json(); } catch { responseData = null; }
        window.dispatchEvent(new CustomEvent('sync-success', {
          detail: { itemId: item.id, response: responseData }
        }));
      } else {
        // HTTP error - increment retry count
        item.retryCount++;
        item.lastError = `HTTP ${response.status}`;
        
        if (item.retryCount >= item.maxRetries) {
          // Max retries reached - remove from queue
          try {
            await removeQueueItem(item.id);
            results.removed++;
          } catch (dbError) {
            console.error(`Failed to remove item ${item.id} after max retries:`, dbError);
          }
          
          results.failed++;
          
          window.dispatchEvent(new CustomEvent('sync-failed', {
            detail: { itemId: item.id, error: item.lastError }
          }));
        } else {
          // Update retry count
          try {
            await updateQueueItem(item);
          } catch (dbError) {
            console.error(`Failed to update retry count for item ${item.id}:`, dbError);
          }
          results.failed++;
        }
      }
    } catch (error) {
      // Network error - increment retry count
      item.retryCount++;
      item.lastError = error instanceof Error ? error.message : 'Network error';
      
      if (item.retryCount >= item.maxRetries) {
        // Max retries reached - remove from queue
        try {
          await removeQueueItem(item.id);
          results.removed++;
        } catch (dbError) {
          console.error(`Failed to remove item ${item.id} after network failure and max retries:`, dbError);
        }
        
        results.failed++;
        
        window.dispatchEvent(new CustomEvent('sync-failed', {
          detail: { itemId: item.id, error: item.lastError }
        }));
      } else {
        // Update retry count
        try {
          await updateQueueItem(item);
        } catch (dbError) {
          console.error(`Failed to update retry count for item ${item.id} after network error:`, dbError);
        }
        results.failed++;
      }
    }
  }

  return results;
  } finally {
    isProcessingSyncQueue = false;
  }
}

/**
 * Clear all items from the queue (for testing/debugging)
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}
