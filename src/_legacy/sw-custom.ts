/**
 * Custom Service Worker Extensions
 * Story 7.8 - Service Worker Smart Upload Filtering
 *
 * Adds Background Sync support for failed /analyze requests.
 * This file is imported by the generated service worker.
 */

declare const self: ServiceWorkerGlobalScope;

const SYNC_TAG = 'analyze-sync';
const DB_NAME = 'afia-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';
const MAX_RETRIES = 5;
const MAX_ITEM_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory lock — prevents concurrent sync runs within same SW lifetime
let isProcessing = false;

/**
 * Background Sync event handler
 * Processes queued analyze requests when connectivity is restored
 */
self.addEventListener('sync', (event: ExtendableEvent & { tag: string }) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(runSyncQueue());
  }
});

async function runSyncQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  try {
    await processSyncQueue();
  } finally {
    isProcessing = false;
  }
}

/**
 * Process the sync queue from IndexedDB
 */
async function processSyncQueue(): Promise<void> {
  try {
    const db = await openDatabase();
    await pruneExpiredItems(db);
    const items = await getAllQueueItems(db);

    for (const item of items) {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.payload),
        });

        if (response.ok) {
          // Success - remove from queue
          await removeQueueItem(db, item.id);

          // Notify all clients
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_SUCCESS',
              itemId: item.id,
            });
          });
        } else {
          // HTTP error - increment retry count
          item.retryCount++;

          if (item.retryCount >= item.maxRetries) {
            await removeQueueItem(db, item.id);

            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_FAILED',
                itemId: item.id,
                error: `HTTP ${response.status}`,
              });
            });
          } else {
            await updateQueueItem(db, item);
          }
        }
      } catch (error) {
        // Network error - increment retry count
        item.retryCount++;

        if (item.retryCount >= item.maxRetries) {
          await removeQueueItem(db, item.id);

          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_FAILED',
              itemId: item.id,
              error: error instanceof Error ? error.message : 'Network error',
            });
          });
        } else {
          await updateQueueItem(db, item);
        }
      }
    }
  } catch (error) {
    console.error('Sync queue processing failed:', error);
  }
}

/**
 * Remove items older than MAX_ITEM_AGE_MS or beyond max retries
 */
async function pruneExpiredItems(db: IDBDatabase): Promise<void> {
  const now = Date.now();
  const items = await getAllQueueItems(db);
  for (const item of items) {
    if (
      now - item.enqueuedAt > MAX_ITEM_AGE_MS ||
      item.retryCount >= MAX_RETRIES
    ) {
      await removeQueueItem(db, item.id);
    }
  }
}

/**
 * Open IndexedDB connection — handles version change by closing stale connections
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

/**
 * Get all items from the queue
 */
function getAllQueueItems(db: IDBDatabase): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore('sync-queue');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Remove an item from the queue
 */
function removeQueueItem(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update an item in the queue
 */
function updateQueueItem(db: IDBDatabase, item: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const request = store.put(item);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export { };
