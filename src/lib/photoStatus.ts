import { PHOTO_SYNC_CHANGED, pendingPhotoChoice, readPhotoSync } from './photoSyncStore';
import { ReviewError, reviewConfigured, sendReviewPhotoStatus } from './sharedReview';

const KEY = 'eventPhotoStatus:v1';
interface Report { signature: string; clientUpdatedAt: number; synced: boolean; expiresAt: number }
let memory: Record<string, Report> = {};
let storageFailed = false;
function read() {
  try {
    if (!storageFailed) {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) memory = saved;
    }
  } catch { /* The durable photo queue can still report again next session. */ }
  return Object.fromEntries(Object.entries(memory).filter(([, value]) => value?.expiresAt > Date.now()));
}
function write(reports: Record<string, Report>) {
  memory = reports;
  try { localStorage.setItem(KEY, JSON.stringify(reports)); storageFailed = false; } catch { storageFailed = true; }
}

/** Reports queue counts and the team's choice, without photos or device details.
 * The queue itself is durable; we re-read it on reconnect instead of replaying
 * stale counts. Quiet/hidden phones send no heartbeat. Server receipt time is
 * displayed as "last reported", never an online indicator. */
export function startPhotoStatusSync() {
  if (!reviewConfigured) return;
  let running = false, stopped = false, dirty = true, refresh = true;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const rejected = new Set<string>();
  const flush = async () => {
    if (running || stopped || !navigator.onLine || document.visibilityState !== 'visible') return;
    running = true;
    dirty = false;
    const force = refresh;
    refresh = false;
    try {
      const { settings, jobs } = await readPhotoSync();
      for (const setting of settings) {
        if (stopped || setting.expiresAt <= Date.now() || rejected.has(setting.huntId)) continue;
        const own = jobs.filter(job => job.huntId === setting.huntId);
        const payload = {
          autoSend: pendingPhotoChoice(setting.huntId) ?? setting.enabled,
          queuedUploads: own.filter(job => job.operation === 'upload').length,
          pendingDeletes: own.filter(job => job.operation === 'delete').length,
          hasError: own.some(job => Boolean(job.error)),
        };
        const signature = JSON.stringify(payload);
        const reports = read(), previous = reports[setting.huntId];
        if (!previous || previous.signature !== signature || force) {
          reports[setting.huntId] = { signature, clientUpdatedAt: Math.max(Date.now(), (previous?.clientUpdatedAt ?? 0) + 1), synced: false, expiresAt: setting.expiresAt };
          write(reports);
        }
        const report = reports[setting.huntId];
        if (report.synced) continue;
        try {
          await sendReviewPhotoStatus(setting.access, { ...payload, clientUpdatedAt: report.clientUpdatedAt });
          const latest = read();
          if (latest[setting.huntId]?.clientUpdatedAt === report.clientUpdatedAt) {
            latest[setting.huntId].synced = true;
            write(latest);
          }
        } catch (error) {
          if (error instanceof ReviewError && [401, 403, 404, 410].includes(error.status)) rejected.add(setting.huntId);
          break; // Retry network failures next interval, without interrupting play.
        }
      }
    } catch { refresh ||= force; /* Never report zero if IndexedDB is unavailable. */ }
    finally { running = false; if (dirty && !stopped) schedule(); }
  };
  const run = () => {
    if (navigator.locks) void navigator.locks.request('scavenger-photo-status', { ifAvailable: true }, lock => lock ? flush() : undefined);
    else void flush();
  };
  const schedule = () => { dirty = true; clearTimeout(debounce); debounce = setTimeout(run, 700); };
  const resume = () => { refresh = true; schedule(); };
  const storage = (event: StorageEvent) => { if (event.key === 'photoSyncChanged') schedule(); };
  const interval = setInterval(run, 30_000);
  window.addEventListener(PHOTO_SYNC_CHANGED, schedule);
  window.addEventListener('online', resume);
  window.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', resume);
  schedule();
  return () => {
    stopped = true; clearTimeout(debounce); clearInterval(interval);
    window.removeEventListener(PHOTO_SYNC_CHANGED, schedule);
    window.removeEventListener('online', resume);
    window.removeEventListener('storage', storage);
    document.removeEventListener('visibilitychange', resume);
  };
}
