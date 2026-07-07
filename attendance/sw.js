// FaceIN Service Worker
// Network-first for the app shell so GitHub updates are always picked up live.
// Falls back to cache only when offline.

const CACHE = 'facein-v2';
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
  const url = new URL(e.request.url);
  const isShell = SHELL.some(s => url.pathname.endsWith(s.replace('./', '')) || url.pathname === '/' );

  if (isShell) {
    // NETWORK-FIRST: always try to get the latest index.html/manifest from GitHub Pages.
    // Only use the cached copy if the network request fails (offline).
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Other assets (face-api models, fonts, libs): network-first with cache fallback
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});
