// IndexedDB storage for scavenger hunt photos

import { openPhotoDB as openDB, PHOTO_STORE as STORE_NAME, PHOTO_SUMMARY_STORE, photoSummaryRow, SYNC_STORES } from './photoDB';
import { queuePhotoMutation, notifyPhotoSync } from './photoSyncStore';

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

export type PhotoSummary = Omit<StoredPhoto, 'imageData'>;

// Save a photo to IndexedDB
export async function savePhoto(photo: StoredPhoto, replaceId?: string): Promise<void> {
  return writePhotos((store, transaction) => {
    const summaries = transaction.objectStore(PHOTO_SUMMARY_STORE);
    const existing = store.getKey(photo.id);
    existing.onsuccess = () => { if (!existing.result) queuePhotoMutation(transaction, photo, 'upload'); };
    if (replaceId && replaceId !== photo.id) {
      const old = summaries.get(replaceId);
      old.onsuccess = () => {
        if (old.result) queuePhotoMutation(transaction, old.result, 'delete');
        store.delete(replaceId);
        summaries.delete(replaceId);
      };
    }
    summaries.put(photoSummaryRow(photo));
    store.put(photo.packId ? photo : { ...photo, packId: 'scavenger' });
  });
}

// Request success precedes transaction commit. Report success only once the
// complete transaction is durable; aborts (including quota failures) reject.
async function writePhotos(write: (store: IDBObjectStore, transaction: IDBTransaction) => void): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([...SYNC_STORES, PHOTO_SUMMARY_STORE], 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? new Error('Photo storage was interrupted.'));
      try {
        write(transaction.objectStore(STORE_NAME), transaction);
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
    notifyPhotoSync();
  } finally {
    db.close();
  }
}

/** Read through an index without deserializing unrelated image records. */
async function read<T>(storeName: string, query: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName);
      const req = query(tx.objectStore(storeName));
      tx.onabort = () => reject(tx.error ?? new Error('Photo read interrupted.'));
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  } finally { db.close(); }
}

function summaryScope(store: IDBObjectStore, packId?: string, huntId?: string | null) {
  if (huntId === undefined) return packId ? { source: store.index('packId'), key: packId } : { source: store, key: undefined };
  const scope = huntId ?? '';
  return packId
    ? { source: store.index('packHunt'), key: [packId, scope] }
    : { source: store.index('huntScope'), key: scope };
}

// undefined includes all hunts, null selects device-only photos, a string selects one event team.
export function getPhotoSummaries(packId?: string, huntId?: string | null): Promise<PhotoSummary[]> {
  return read(PHOTO_SUMMARY_STORE, store => {
    const { source, key } = summaryScope(store, packId, huntId);
    return source.getAll(key);
  });
}

export function getPhotoCount(packId?: string, huntId?: string | null): Promise<number> {
  return read(PHOTO_SUMMARY_STORE, store => {
    const { source, key } = summaryScope(store, packId, huntId);
    return source.count(key);
  });
}

export async function getStoredPhoto(id: string): Promise<StoredPhoto> {
  const photo: StoredPhoto | undefined = await read(STORE_NAME, store => store.get(id));
  if (!photo) throw new Error('This photo is no longer on the device.');
  return photo;
}

// Delete a specific photo
export async function deletePhoto(photoId: string): Promise<void> {
  return writePhotos((store, transaction) => {
    const summaries = transaction.objectStore(PHOTO_SUMMARY_STORE);
    const request = summaries.get(photoId);
    request.onsuccess = () => {
      if (request.result) queuePhotoMutation(transaction, request.result, 'delete');
      store.delete(photoId);
      summaries.delete(photoId);
    };
  });
}

export async function clearAllPhotos(packId?: string, huntId?: string | null): Promise<void> {
  return writePhotos((store, transaction) => {
    const summaries = transaction.objectStore(PHOTO_SUMMARY_STORE);
    const { source, key } = summaryScope(summaries, packId, huntId);
    const request = source.openCursor(key);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      queuePhotoMutation(transaction, cursor.value, 'delete');
      store.delete(cursor.primaryKey);
      cursor.delete();
      cursor.continue();
    };
  });
}
