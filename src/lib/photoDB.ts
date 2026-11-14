import type { StoredPhoto } from './photoStorage';
const DB_NAME = 'ScavengerHuntPhotos';
const DB_VERSION = 4;
export const PHOTO_STORE = 'photos';
export const SETTINGS_STORE = 'photoSyncSettings';
export const JOB_STORE = 'photoSyncJobs';
export const SYNC_STORES = [PHOTO_STORE, SETTINGS_STORE, JOB_STORE];
const STORE_NAME = PHOTO_STORE;

// Open the database
export function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let blocked = false;

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other hunt tabs and retry.'));
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const name of [SETTINGS_STORE, JOB_STORE]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === SETTINGS_STORE ? 'huntId' : 'id' });
      }
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      // Create object store for photos
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('challengeId', 'challengeId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('packId', 'packId', { unique: false });
      }

      // v3 upgrade: add a packId index and backfill any pre-existing rows so
      // they belong to the original scavenger pack (no orphaned photos).
      const store = transaction?.objectStore(STORE_NAME);
      if (store && !store.indexNames.contains('packId')) {
        store.createIndex('packId', 'packId', { unique: false });
        store.openCursor().onsuccess = function () {
          const cursor = this.result;
          if (cursor) {
            const row = cursor.value as StoredPhoto;
            if (row.packId === undefined) {
              cursor.update({ ...row, packId: 'scavenger' });
            }
            cursor.continue();
          }
        };
      }
    };
  });
}

