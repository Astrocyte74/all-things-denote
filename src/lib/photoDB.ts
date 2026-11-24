import type { StoredPhoto } from './photoStorage';
const DB_NAME = 'ScavengerHuntPhotos';
const DB_VERSION = 5;
export const PHOTO_STORE = 'photos';
export const PHOTO_SUMMARY_STORE = 'photoSummaries';
export const SETTINGS_STORE = 'photoSyncSettings';
export const JOB_STORE = 'photoSyncJobs';
export const SYNC_STORES = [PHOTO_STORE, SETTINGS_STORE, JOB_STORE];
// The empty scope is the on-device hunt. IndexedDB does not index null or undefined.
export function photoSummaryRow(photo: StoredPhoto) {
  return {
    id: photo.id, challengeId: photo.challengeId, challengeNumber: photo.challengeNumber,
    challengeTitle: photo.challengeTitle, categoryId: photo.categoryId, categoryTitle: photo.categoryTitle,
    categoryIcon: photo.categoryIcon, categoryColor: photo.categoryColor, pathId: photo.pathId,
    teamName: photo.teamName, timestamp: photo.timestamp, packId: photo.packId ?? 'scavenger',
    huntId: photo.huntId, huntScope: photo.huntId ?? '',
  };
}

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
      const store = db.objectStoreNames.contains(PHOTO_STORE)
        ? request.transaction!.objectStore(PHOTO_STORE)
        : db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      for (const name of ['challengeId', 'timestamp', 'packId']) {
        if (!store.indexNames.contains(name)) store.createIndex(name, name);
      }

      // Backfill pre-v5 photos one at a time in the upgrade transaction. Only
      // pre-v3 rows lacking a pack need the original image record rewritten.
      const summaries = db.createObjectStore(PHOTO_SUMMARY_STORE, { keyPath: 'id' });
      summaries.createIndex('packId', 'packId');
      summaries.createIndex('huntScope', 'huntScope');
      summaries.createIndex('packHunt', ['packId', 'huntScope']);
      store.openCursor().onsuccess = function () {
        const cursor = this.result;
        if (!cursor) return;
        const photo: StoredPhoto = cursor.value;
        if (!photo.packId) cursor.update({ ...photo, packId: 'scavenger' });
        summaries.put(photoSummaryRow(photo));
        cursor.continue();
      };
    };
  });
}
