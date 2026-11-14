import { PACKS } from '@/data/packs';
import { eventHuntId, type EventHunt } from './eventHunt';
import { ReviewError, reviewConfigured, sendReviewProgress, type EventAccess } from './sharedReview';

const KEY = 'eventProgress:v1';
const CHANGED = 'event-progress-changed';
interface PendingProgress {
  access: EventAccess;
  expiresAt: number;
  completedChallengeIds: string[];
  clientUpdatedAt: number;
  synced: boolean;
}
type Queue = Record<string, PendingProgress>;
let memory: Queue = {};
let storageFailed = false;

function read(): Queue {
  try {
    if (!storageFailed) {
      const value = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) memory = value;
    }
  } catch { /* Progress can still sync this session if storage is unavailable. */ }
  return Object.fromEntries(Object.entries(memory).filter(([, item]) => item?.expiresAt > Date.now() && item.access?.role === 'team' && Array.isArray(item.completedChallengeIds)));
}
function write(queue: Queue) {
  memory = queue;
  try { localStorage.setItem(KEY, JSON.stringify(queue)); storageFailed = false; } catch { storageFailed = true; }
}

/** Record only clue completion, never photo bytes or location. New edits replace
 * an offline pending update; old, already-sent state keeps its original timestamp. */
export function recordEventProgress(hunt: EventHunt, ids: readonly string[]) {
  if (!reviewConfigured || hunt.event.expiresAt <= Date.now()) return;
  const pack = PACKS.find(pack => pack.id === hunt.event.packId);
  if (!pack) return;
  const canonical = pack.categories.flatMap(category => category.challenges.map(clue => clue.id)).filter(id => ids.includes(id));
  const key = eventHuntId(hunt.event.id, hunt.team.id);
  const queue = read(), previous = queue[key];
  if (previous && JSON.stringify(previous.completedChallengeIds) === JSON.stringify(canonical)) return;
  queue[key] = { access: hunt.access, expiresAt: hunt.event.expiresAt, completedChallengeIds: canonical, clientUpdatedAt: Math.max(Date.now(), (previous?.clientUpdatedAt ?? 0) + 1), synced: false };
  write(queue);
  window.dispatchEvent(new Event(CHANGED));
}

/** Mount once for the whole app, so leaving the hunt doesn't lose an offline retry.
 * A single flight per tab and timestamp-conditional writes prevent stale responses
 * from overwriting a newer completion or reset. Idle teams send no heartbeat. */
export function startProgressSync() {
  let running = false, stopped = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const flush = async () => {
    if (running || stopped || !navigator.onLine || document.visibilityState !== 'visible') return;
    running = true;
    let failed = false;
    try {
      for (const [key, item] of Object.entries(read())) {
        if (item.synced || stopped) continue;
        try {
          await sendReviewProgress(item.access, { completedChallengeIds: item.completedChallengeIds, clientUpdatedAt: item.clientUpdatedAt });
          const latest = read();
          if (latest[key]?.clientUpdatedAt === item.clientUpdatedAt) { latest[key].synced = true; write(latest); }
        } catch (error) {
          if (error instanceof ReviewError && [401, 403, 404, 410].includes(error.status)) {
            const latest = read(); delete latest[key]; write(latest);
          }
          // Network failures remain queued. No toast interrupts the game.
          failed = true;
          break;
        }
      }
    } finally {
      running = false;
      if (!failed && !stopped && Object.values(read()).some(item => !item.synced)) schedule();
    }
  };
  const schedule = () => { clearTimeout(debounce); debounce = setTimeout(() => void flush(), 750); };
  const interval = setInterval(() => void flush(), 30_000);
  window.addEventListener(CHANGED, schedule);
  window.addEventListener('online', schedule);
  window.addEventListener('storage', schedule);
  document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => {
    stopped = true; clearTimeout(debounce); clearInterval(interval);
    window.removeEventListener(CHANGED, schedule);
    window.removeEventListener('online', schedule);
    window.removeEventListener('storage', schedule);
    document.removeEventListener('visibilitychange', schedule);
  };
}
