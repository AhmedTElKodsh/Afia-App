/**
 * Custom Service Worker Extensions
 * Story 7.8 - Service Worker Smart Upload Filtering
 * 
 * Adds Background Sync support for failed /analyze requests.
 * This file is imported by the generated service worker.
 */

declare const self: ServiceWorkerGlobalScope;

/**
 * Background Sync event handler
 * Processes queued analyze requests when connectivity is restored
 */
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'analyze-sync') {
    event.waitUntil(processSyncQueue());
  }
});

/**
 * Process the sync queue from IndexedDB
 * This is a simplified version that delegates to the main app's sync queue
 */
async function processSyncQueue(): Promise<void> {
  try {
    // Open IndexedDB
    const db = await openDatabase();
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
 * Open IndexedDB connection
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('afia-sync-queue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all items from the queue
 */
function getAllQueueItems(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readonly');
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
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update an item in the queue
 */
function updateQueueItem(db: IDBDatabase, item: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    const request = store.put(item);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export {};
