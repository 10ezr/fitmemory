// Basic service worker for FitMemory
const CACHE_NAME = 'fitmemory-v1';
const urlsToCache = [
  '/',
  '/offline'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view' || event.action === 'progress') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'workout' || event.action === 'start') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
