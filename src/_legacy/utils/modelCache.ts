/**
 * Utility for caching binary model files in IndexedDB
 */
const DB_NAME = "AfiaModelCache";
const STORE_NAME = "models";
const DB_VERSION = 1;

export interface CachedModel {
  path: string;
  version: string;
  data: ArrayBuffer;
  timestamp: number;
}

/**
 * Open the IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "path" });
      }
    };
  });
}

/**
 * Get a model from cache
 */
export async function getCachedModel(path: string, version: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(path);

      request.onerror = () => reject(new Error("Failed to get from IndexedDB"));
      request.onsuccess = () => {
        const result = request.result as CachedModel | undefined;
        if (result && result.version === version) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
    });
  } catch (err) {
    console.warn("[ModelCache] Read failed:", err);
    return null;
  }
}

/**
 * Save a model to cache
 */
export async function setCachedModel(path: string, version: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        path,
        version,
        data,
        timestamp: Date.now()
      });

      request.onerror = () => reject(new Error("Failed to save to IndexedDB"));
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.warn("[ModelCache] Save failed:", err);
  }
}
