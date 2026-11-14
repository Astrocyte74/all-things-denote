import { useSyncExternalStore } from 'react';

let savingPhotos = 0;
let registration: ServiceWorkerRegistration | undefined;
let state = { ready: false, update: false, saving: false, error: false };
const listeners = new Set<() => void>();
function publish(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  listeners.forEach(listener => listener());
}

export function useOfflineStatus() {
  return useSyncExternalStore(listener => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => state);
}

export function beginPhotoSave() {
  savingPhotos++;
  publish({ saving: true });
  return () => {
    savingPhotos--;
    publish({ saving: savingPhotos > 0 });
  };
}

export async function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' });
    const inspect = () => {
      // Only our generated worker guarantees the complete app is cached.
      navigator.serviceWorker.controller?.postMessage({ type: 'OFFLINE_STATUS' });
      publish({ update: Boolean(registration?.waiting) });
    };
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'OFFLINE_READY') publish({ ready: true, error: false });
    });
    navigator.serviceWorker.addEventListener('controllerchange', inspect);
    const watchInstalling = () => {
      const worker = registration?.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'redundant') publish({ error: true });
        inspect();
      });
    };
    registration.addEventListener('updatefound', watchInstalling);
    watchInstalling();
    inspect();
    navigator.serviceWorker.ready.then(inspect);
    // Check when returning to the app, without interrupting the current hunt.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registration?.update().catch(() => { /* Existing offline copy still works. */ });
      }
    });
  } catch (error) {
    console.error('Offline setup failed:', error);
    publish({ error: true });
  }
}

export function applyUpdate() {
  if (savingPhotos || !registration?.waiting) return;
  // Only the tab whose user chose Update reloads. Other tabs keep their hunt.
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
