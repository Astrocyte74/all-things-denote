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
  teamName?: string; // Snapshot at capture time; renaming a team never relabels older photos
  packId?: string; // Game pack id ('scavenger' | 'creation') - optional for pre-v3 rows
  huntId?: string; // Event/team scope; absent for a device-only hunt
  imageData: string; // base64 encoded image
  timestamp: number;
}

// Open the database
function openDB(): Promise<IDBDatabase> {
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
  return writePhotos(store => { store.put(photo); });
}

// Request success precedes transaction commit. Report success only once the
// complete transaction is durable; aborts (including quota failures) reject.
async function writePhotos(write: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('Photo storage was interrupted.'));
      write(transaction.objectStore(STORE_NAME));
    });
  } finally {
    db.close();
  }
}

// Scope: undefined includes all hunts; null selects device-only photos; a string selects one event team.
// Get all photos from IndexedDB (optionally limited to one pack)
export async function getAllPhotos(packId?: string, huntId?: string | null): Promise<StoredPhoto[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
    const store = transaction.objectStore(STORE_NAME);
    const request = packId ? store.index('packId').getAll(packId) : store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.filter((photo: StoredPhoto) => huntId === undefined || (photo.huntId ?? null) === huntId));
  });
}

// Get photos for a specific challenge
export async function getPhotosByChallenge(challengeId: string, huntId?: string | null): Promise<StoredPhoto[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('challengeId');
    const request = index.getAll(challengeId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.filter((photo: StoredPhoto) => huntId === undefined || (photo.huntId ?? null) === huntId));
  });
}

// Delete a specific photo
export async function deletePhoto(photoId: string): Promise<void> {
  return writePhotos(store => { store.delete(photoId); });
}

// Clear all photos (optionally only those for one pack)
export async function clearAllPhotos(packId?: string, huntId?: string | null): Promise<void> {
  return writePhotos(store => {
    if (!packId && huntId === undefined) {
      store.clear();
      return;
    }
    const request = packId ? store.index('packId').openCursor(IDBKeyRange.only(packId)) : store.openCursor();
    request.onsuccess = function () {
      const cursor = this.result;
      if (cursor) {
        if (huntId === undefined || (cursor.value.huntId ?? null) === huntId) cursor.delete();
        cursor.continue();
      }
    };
  });
}

// Get photo count (optionally only for one pack)
export async function getPhotoCount(packId?: string, huntId?: string | null): Promise<number> {
  if (huntId !== undefined) return (await getAllPhotos(packId, huntId)).length;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => db.close();
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
