import { openPhotoDB, PHOTO_STORE, SETTINGS_STORE, JOB_STORE, SYNC_STORES } from './photoDB';
import { eventHuntId, type EventHunt } from './eventHunt';
import type { EventAccess } from './sharedReview';
import type { StoredPhoto } from './photoStorage';

export const PHOTO_SYNC_CHANGED = 'photo-sync-changed';
export const PHOTO_SYNC_SENT = 'photo-sync-sent';
export interface PhotoSyncSettings {
  huntId: string; access: EventAccess; packId: string; expiresAt: number; enabled: boolean;
}
export interface PhotoSyncJob {
  id: string; huntId: string; photoId: string; operation: 'upload' | 'delete';
  version: string; createdAt: number; nextAttempt: number; attempts: number; error?: string; blocked?: boolean;
}
export function notifyPhotoSync() {
  window.dispatchEvent(new Event(PHOTO_SYNC_CHANGED));
  try { localStorage.setItem('photoSyncChanged', crypto.randomUUID()); } catch { /* same-tab sync still works */ }
}
export const photoJobId = (huntId: string, photoId: string) => `${huntId}:${photoId}`;

function transaction<T>(mode: IDBTransactionMode, action: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
  return openPhotoDB().then(db => new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try { tx = db.transaction(SYNC_STORES, mode); } catch (error) { db.close(); reject(error); return; }
    let value: T;
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Photo sharing settings could not be saved.')); };
    try { action(tx, result => { value = result; }); } catch (error) { tx.abort(); reject(error); }
  }));
}

/** Photo and queue mutation commit together: even a reload immediately after a
 * save/deletion cannot lose the pending cloud operation. No image bytes duplicated. */
export function queuePhotoMutation(tx: IDBTransaction, photo: StoredPhoto, operation: PhotoSyncJob['operation']) {
  if (!photo.huntId) return;
  const huntId = photo.huntId, jobs = tx.objectStore(JOB_STORE);
  const id = photoJobId(huntId, photo.id);
  const request = tx.objectStore(SETTINGS_STORE).get(huntId);
  request.onsuccess = () => {
    const settings = request.result as PhotoSyncSettings | undefined;
    if (operation === 'delete') jobs.delete(id); // Cancel any unsent upload, even with sharing off.
    if (!settings?.enabled || pendingPhotoChoice(huntId) === false || settings.expiresAt <= Date.now() || settings.packId !== photo.packId) return;
    jobs.put({ id, huntId, photoId: photo.id, operation, version: crypto.randomUUID(), createdAt: Date.now(), nextAttempt: 0, attempts: 0 } satisfies PhotoSyncJob);
  };
}

/** Missing preference uses the join default once. Later leader edits never
 * change an existing team's device choice. Enabling never scans older photos. */
const failedChoices = new Map<string, boolean>();
export function pendingPhotoChoice(huntId: string): boolean | undefined {
  if (failedChoices.has(huntId)) return failedChoices.get(huntId);
  try { const value=sessionStorage.getItem(`photoSyncChoice:${huntId}`); return value===null?undefined:value==='true'; } catch { return undefined; }
}
function preserveChoice(huntId: string, value: boolean | undefined) {
  if (value===undefined) failedChoices.delete(huntId); else failedChoices.set(huntId,value);
  try { if(value===undefined)sessionStorage.removeItem(`photoSyncChoice:${huntId}`);else sessionStorage.setItem(`photoSyncChoice:${huntId}`,String(value)); } catch { /* memory still preserves the choice this session */ }
}
export async function configurePhotoSync(hunt: EventHunt, enabled?: boolean) {
  if (hunt.access.role !== 'team') return;
  const huntId = eventHuntId(hunt.event.id, hunt.team.id);
  const choice = enabled ?? pendingPhotoChoice(huntId);
  try { await transaction<void>('readwrite', tx => {
    const settings = tx.objectStore(SETTINGS_STORE), request = settings.get(huntId);
    request.onsuccess = () => {
      const previous = request.result as PhotoSyncSettings | undefined;
      const next: PhotoSyncSettings = { huntId, access: hunt.access, packId: hunt.event.packId, expiresAt: hunt.event.expiresAt, enabled: choice ?? previous?.enabled ?? hunt.event.autoUploadDefault ?? false };
      settings.put(next);
      if (!next.enabled) {
        const cursor = tx.objectStore(JOB_STORE).openCursor();
        cursor.onsuccess = () => { const row = cursor.result; if (!row) return; if (row.value.huntId === huntId && row.value.operation === 'upload') row.delete(); row.continue(); };
      }
    };
  });
    preserveChoice(huntId, undefined);
  } catch(error) { if(choice!==undefined)preserveChoice(huntId,choice); notifyPhotoSync(); throw error; }
  notifyPhotoSync();
}
export function readPhotoSync(huntId?: string) {
  return transaction<{settings: PhotoSyncSettings[]; jobs: PhotoSyncJob[]}>('readonly', (tx, result) => {
    let settings: PhotoSyncSettings[] = [], jobs: PhotoSyncJob[] = [];
    const a = tx.objectStore(SETTINGS_STORE).getAll(), b = tx.objectStore(JOB_STORE).getAll();
    a.onsuccess = () => { settings = a.result.filter((s: PhotoSyncSettings) => !huntId || s.huntId === huntId); result({settings, jobs}); };
    b.onsuccess = () => { jobs = b.result.filter((j: PhotoSyncJob) => !huntId || j.huntId === huntId); result({settings, jobs}); };
  });
}
export function readSyncPhoto(id: string) {
  return transaction<StoredPhoto | undefined>('readonly', (tx, result) => { const r=tx.objectStore(PHOTO_STORE).get(id); r.onsuccess=()=>result(r.result); });
}
export async function finishPhotoJob(job: PhotoSyncJob, failure?: Pick<PhotoSyncJob, 'error'|'nextAttempt'|'attempts'|'blocked'>) {
  await transaction<void>('readwrite', tx => {
    const store=tx.objectStore(JOB_STORE), request=store.get(job.id);
    request.onsuccess=()=>{ if (request.result?.version !== job.version) return; if(failure)store.put({...request.result,...failure});else store.delete(job.id); };
  });
  notifyPhotoSync();
}
/** Manual cloud deletion cancels this browser's pending automatic retry. The
 * server's removal marker also blocks delayed retries on another tab/device. */
export async function cancelPhotoUpload(huntId: string, photoId: string) {
  await transaction<void>('readwrite', tx => {
    const store=tx.objectStore(JOB_STORE), r=store.get(photoJobId(huntId,photoId));
    r.onsuccess=()=>{if(r.result?.operation==='upload')store.delete(r.result.id);};
  });
  notifyPhotoSync();
}
export async function retryPhotoSync(huntId: string) {
  await transaction<void>('readwrite', tx => {
    const r=tx.objectStore(JOB_STORE).openCursor();
    r.onsuccess=()=>{const c=r.result;if(!c)return;if(c.value.huntId===huntId)c.update({...c.value,nextAttempt:0,blocked:false,error:undefined});c.continue();};
  });
  notifyPhotoSync();
}
