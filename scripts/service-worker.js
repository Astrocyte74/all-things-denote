/* VERSION and ASSETS are injected by build-sw.mjs. */
const PREFIX = `hunt-offline:${self.registration.scope}:`;
const CACHE = PREFIX + VERSION;
const assetUrls = new Set(ASSETS.map(file => new URL(file, self.registration.scope).href));
const shellUrl = new URL('index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Installation fails as a unit if any required file cannot be cached.
    await cache.addAll([...assetUrls].map(url => new Request(url, { cache: 'reload' })));
  })());
  // Updates wait until the user chooses Update (or all old tabs are closed).
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep older app versions for already-open tabs; prune on a future release.
    // Never delete other apps' caches on the same GitHub Pages origin.
    const keys = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
    await Promise.all(keys.slice(0, -2).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Serve a matched app shell and its matching chunks, even on slow networks.
    if (request.mode === 'navigate') return (await cache.match(shellUrl)) || fetch(request);
    // Static assets are identical across request modes. Some hosts emit Vary:
    // Origin, but prefetches and module loads send different Origin headers.
    const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    // An older open tab can still request its own lazy-loaded chunks.
    for (const name of (await caches.keys()).filter(key => key.startsWith(PREFIX))) {
      const older = await (await caches.open(name)).match(request, { ignoreVary: true });
      if (older) return older;
    }
    return fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'OFFLINE_STATUS') event.source?.postMessage({ type: 'OFFLINE_READY' });
});
