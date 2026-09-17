const CACHE = 'finpocket-v7';

const ASSETS = [
  './',
  './style.css',
  './notifications.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);

  // HTML ve JavaScript'e Service Worker müdahale etmez.
  // Böylece iPhone Safari/PWA sayfa açılışı normal network üzerinden çalışır.
  if (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js')
  ) {
    return;
  }

  // CSS, ikon vb. statik dosyalar cache'den kullanılabilir.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            event.waitUntil(
              caches.open(CACHE)
                .then(cache => cache.put(event.request, copy))
            );
          }

          return response;
        });
      })
  );
});
