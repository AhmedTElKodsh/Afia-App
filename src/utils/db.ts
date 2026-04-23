import { openDB, type IDBPDatabase } from 'idb';

/**
 * General Purpose IndexedDB Utility for Afia App
 * Standardized using the 'idb' library
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
async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store for model files
      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        db.createObjectStore(STORES.MODELS, { keyPath: "path" });
      }
      
      // Store for scan history
      if (!db.objectStoreNames.contains(STORES.HISTORY)) {
        db.createObjectStore(STORES.HISTORY, { keyPath: "id" });
      }
    },
  });
}

/**
 * Generic Get
 */
export async function getFromDB<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const result = await db.get(storeName, key);
    return result || null;
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
    const db = await getDB();
    return await db.getAll(storeName);
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
    const db = await getDB();
    await db.put(storeName, item);
  } catch (err) {
    console.warn(`[DB] Put failed for ${storeName}:`, err);
  }
}

/**
 * Generic Delete
 */
export async function deleteFromDB(storeName: string, key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(storeName, key);
  } catch (err) {
    console.warn(`[DB] Delete failed for ${storeName}:`, err);
  }
}

/**
 * Generic Clear
 */
export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(storeName);
  } catch (err) {
    console.warn(`[DB] Clear failed for ${storeName}:`, err);
  }
}
