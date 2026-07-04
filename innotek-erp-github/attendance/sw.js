// FaceIN Service Worker — Phase 1
// Caches the app shell for offline use.
// face-api model weights come from CDN (not cached here — too large).

const CACHE = 'facein-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Cache-first for shell; network-first for everything else (CDN models etc.)
  const url = new URL(e.request.url);
  if (SHELL.some(s => url.pathname.endsWith(s.replace('./', '')))) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  } else {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
