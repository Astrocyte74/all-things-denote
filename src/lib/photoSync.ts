import { ReviewError, deleteReviewLocalPhoto, uploadReviewPhoto } from './sharedReview';
import { photoFailureScope } from './photoUploadFailure';
import { retryPhotoSync, finishPhotoJob, PHOTO_SYNC_CHANGED, PHOTO_SYNC_SENT, readPhotoSync, readSyncPhoto, pendingPhotoChoice, type PhotoSyncJob } from './photoSyncStore';

let active: { job: PhotoSyncJob; controller: AbortController } | null = null;
let paused = 0;
export function uploadingPhoto(huntId: string) { return active?.job.huntId === huntId; }
export function pausePhotoSync() {
  paused++; active?.controller.abort();
  return () => { paused = Math.max(0, paused - 1); window.dispatchEvent(new Event(PHOTO_SYNC_CHANGED)); };
}
function announce() { window.dispatchEvent(new Event(PHOTO_SYNC_CHANGED)); }

/** One photo at a time, only while visible/online. Web Locks prevent competing
 * tabs; server idempotency/removal markers also cover retries and other devices. */
export function startPhotoSync() {
  let stopped = false, running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const canRun = () => !stopped && !paused && navigator.onLine && document.visibilityState === 'visible';
  let connectionGeneration = 0;
  const run = async () => {
    const initial = await readPhotoSync();
    for (const job of initial.jobs.sort((a,b) => Number(a.operation==='upload')-Number(b.operation==='upload') || a.createdAt-b.createdAt)) {
      if (!canRun()) break;
      const fresh = await readPhotoSync(job.huntId);
      const current = fresh.jobs.find(item => item.id === job.id);
      if (!current || current.version !== job.version) continue;
      const settings = fresh.settings[0];
      if (!settings || settings.expiresAt <= Date.now() || ((!settings.enabled || pendingPhotoChoice(job.huntId)===false) && job.operation === 'upload')) { await finishPhotoJob(job); continue; }
      if (current.blocked || current.nextAttempt > Date.now()) continue;
      const pausedByAnotherJob = fresh.jobs.some(item =>
        (item.blocked || item.nextAttempt > Date.now()) && (
          item.failureScope === 'event' || item.failureScope === 'connection' ||
          (item.failureScope === 'uploads' && job.operation === 'upload')
        ));
      if (pausedByAnotherJob) continue;
      const connectionAtStart = connectionGeneration;
      let clueNumber: number | undefined;
      const controller = new AbortController(); active = {job, controller}; announce();
      try {
        if (job.operation === 'delete') {
          await deleteReviewLocalPhoto(settings.access, job.photoId);
        } else {
          const photo = await readSyncPhoto(job.photoId);
          if (!photo || photo.huntId !== settings.huntId || photo.packId !== settings.packId) { await finishPhotoJob(job); continue; }
          if (!canRun() || controller.signal.aborted) continue;
          clueNumber = photo.challengeNumber;
          await uploadReviewPhoto(settings.access, photo, undefined, {automatic:true, signal:controller.signal});
        }
        await finishPhotoJob(job);
        window.dispatchEvent(new CustomEvent(PHOTO_SYNC_SENT, {detail:{huntId:job.huntId}}));
      } catch (error) {
        if (error instanceof ReviewError && error.code === 'PHOTO_REMOVED') { await finishPhotoJob(job); continue; }
        if (error instanceof ReviewError && error.code === 'ABORTED') continue;
        const scope = photoFailureScope(error);
        const status = error instanceof ReviewError ? error.status : undefined;
        const code = error instanceof ReviewError ? error.code : undefined;
        const attempts = current.attempts + 1;
        // Older Workers send an uncoded conflict for a pending reservation.
        const pendingConflict = status === 409 && (!code || code === 'UPLOAD_IN_PROGRESS');
        const retryable = scope === 'connection' || scope === 'uploads' || status === 429 ||
          (status !== undefined && status >= 500) || (pendingConflict && attempts < 4);
        const delay = scope === 'uploads' || pendingConflict ? 120_000 : Math.min(300_000, 10_000 * 2 ** Math.min(attempts, 5));
        const message = scope === 'connection' ? 'Waiting for a connection. Keep the app open to send queued changes.' :
          error instanceof Error ? error.message : 'Photo sending was interrupted. Retry when ready.';
        let explanation = message;
        if (clueNumber && scope === 'photo' && !retryable) {
          explanation = `Clue ${clueNumber}: ${message}`;
          if (code !== 'PHOTO_EXCEEDS_REMAINING_STORAGE') explanation += ' Open the gallery to retake this photo.';
        }
        await finishPhotoJob(job, {
          attempts, error: explanation,
          blocked: !retryable, failureScope: scope,
          nextAttempt: scope === 'connection' && connectionGeneration !== connectionAtStart ? 0 : Date.now() + delay,
        });
      } finally { active=null; announce(); }
    }
  };
  const flush = async () => {
    if (running || !canRun()) return;
    running=true;
    try {
      if (navigator.locks) await navigator.locks.request('scavenger-photo-sync',{ifAvailable:true},async lock=>{if(lock)await run();});
      else await run();
    } catch { /* IndexedDB failure is shown by the controls; never break the hunt. */ }
    finally {running=false;}
  };
  const changed = () => {
    if (active) {
      const current=active;
      void readPhotoSync(current.job.huntId).then(({settings,jobs})=>{
        if (active!==current) return;
        if (!canRun() || !jobs.some(job=>job.id===current.job.id&&job.version===current.job.version) || (current.job.operation==='upload'&&(!settings[0]?.enabled || pendingPhotoChoice(current.job.huntId)===false))) current.controller.abort();
      }).catch(()=>current.controller.abort());
    }
    clearTimeout(timer); timer=setTimeout(()=>void flush(),400);
  };
  const storage = (event: StorageEvent) => { if(event.key==='photoSyncChanged')changed(); };
  const reconnected = () => {
    connectionGeneration++;
    void retryPhotoSync().catch(changed);
  };
  window.addEventListener(PHOTO_SYNC_CHANGED,changed); window.addEventListener('online',reconnected);
  window.addEventListener('offline',changed); window.addEventListener('storage',storage);
  document.addEventListener('visibilitychange',changed);
  const interval=setInterval(()=>void flush(),30_000); changed();
  return()=>{stopped=true;clearTimeout(timer);clearInterval(interval);active?.controller.abort();window.removeEventListener(PHOTO_SYNC_CHANGED,changed);window.removeEventListener('online',reconnected);window.removeEventListener('offline',changed);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',changed);};
}
