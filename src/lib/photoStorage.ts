// IndexedDB storage for scavenger hunt photos

const DB_NAME = 'ScavengerHuntPhotos';
const DB_VERSION = 3; // v3: added packId field + index (with backfill of existing rows)
const STORE_NAME = 'photos';

export interface StoredPhoto {
  id: string;
  challengeId: string;
  challengeNumber: number;
  challengeTitle: string;
  categoryId: string;
  categoryTitle: string;
  categoryIcon: string;
  categoryColor: string;
  pathId?: string; // Team path (A, B, C, etc.) - optional for backward compatibility
  packId?: string; // Game pack id ('scavenger' | 'creation') - optional for pre-v3 rows
  imageData: string; // base64 encoded image
  timestamp: number;
}

// Open the database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
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

// Save a photo to IndexedDB
export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(photo);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get all photos from IndexedDB (optionally limited to one pack)
export async function getAllPhotos(packId?: string): Promise<StoredPhoto[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = packId ? store.index('packId').getAll(packId) : store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Get photos for a specific challenge
export async function getPhotosByChallenge(challengeId: string): Promise<StoredPhoto[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('challengeId');
    const request = index.getAll(challengeId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Delete a specific photo
export async function deletePhoto(photoId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(photoId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Clear all photos (optionally only those for one pack)
export async function clearAllPhotos(packId?: string): Promise<void> {
  const db = await openDB();

  // No filter -> wipe the whole store (existing "Start fresh" behavior).
  if (!packId) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Otherwise delete only rows matching this pack via a cursor on the index.
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.index('packId').openCursor(IDBKeyRange.only(packId));

    request.onerror = () => reject(request.error);
    request.onsuccess = function () {
      const cursor = this.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve();
  });
}

// Get photo count (optionally only for one pack)
export async function getPhotoCount(packId?: string): Promise<number> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = packId ? store.index('packId').count(packId) : store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Check if a challenge has a photo
export async function hasPhotoForChallenge(challengeId: string): Promise<boolean> {
  const photos = await getPhotosByChallenge(challengeId);
  return photos.length > 0;
}
