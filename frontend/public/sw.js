// AION service worker.
//
// Deliberately conservative. A cache that outlives a deploy is how a user ends
// up staring at an old bundle and reporting a bug that was already fixed, so:
// hashed assets are cached because their name changes when they change, the
// HTML shell is always fetched from the network first, and /api is never
// touched at all.
const VERSION = 'aion-20260922-v5';
const SHELL = 'aion-shell-' + VERSION;
const ASSETS = 'aion-assets-' + VERSION;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/'])).catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Live state, authentication and speech must never be served from a cache.
  if (url.pathname.startsWith('/api/')) return;

  // Hashed build output: the filename changes whenever the bytes do.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSETS);
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    })());
    return;
  }

  // Everything else — the HTML shell, icons, fonts — is network-first so a
  // deploy is visible immediately, with the cache only as an offline fallback.
  event.respondWith((async () => {
    try {
      const res = await fetch(request);
      if (res.ok && request.mode === 'navigate') {
        const cache = await caches.open(SHELL);
        cache.put('/', res.clone());
      }
      return res;
    } catch {
      const cached = (await caches.match(request)) || (await caches.match('/'));
      if (cached) return cached;
      throw new Error('offline');
    }
  })());
});
