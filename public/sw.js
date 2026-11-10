// Self-unregistering Service Worker to permanently clean up legacy browser caches
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      if (self.clients && self.clients.claim) {
        return self.clients.claim();
      }
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

// Always bypass cache and fetch directly from network without caching
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});


