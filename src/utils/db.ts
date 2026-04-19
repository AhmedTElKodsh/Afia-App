/**
 * General Purpose IndexedDB Utility for Afia App
 */
const DB_NAME = "AfiaAppDB";
const DB_VERSION = 2; // Increment version to add scan_history

export const STORES = {
  MODELS: "models",
  HISTORY: "scan_history"
};

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
      
      // Store for model files
      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        db.createObjectStore(STORES.MODELS, { keyPath: "path" });
      }
      
      // Store for scan history
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        db.createObjectStore(STORES.HISTORY, { keyPath: "id" });
      }
    };
  });
}

/**
 * Generic Get
 */
export async function getFromDB<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onerror = () => reject(new Error(`Failed to get from ${storeName}`));
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.warn(`[DB] Read failed for ${storeName}:`, err);
    return null;
  }
}

/**
 * Generic GetAll
 */
export async function getAllFromDB<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onerror = () => reject(new Error(`Failed to getAll from ${storeName}`));
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.warn(`[DB] GetAll failed for ${storeName}:`, err);
    return [];
  }
}

/**
 * Generic Put
 */
export async function putToDB<T>(storeName: string, item: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onerror = () => reject(new Error(`Failed to put to ${storeName}`));
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.warn(`[DB] Put failed for ${storeName}:`, err);
  }
}

/**
 * Generic Delete
 */
export async function deleteFromDB(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.warn(`[DB] Delete failed for ${storeName}:`, err);
  }
}

/**
 * Generic Clear
 */
export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.warn(`[DB] Clear failed for ${storeName}:`, err);
  }
}
