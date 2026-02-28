
const CACHE_NAME = 'army-tms-v2026-offline-v4'; // Bump version to clear old cache

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force waiting service worker to become active
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
          console.log('[SW] Opened cache');
          return Promise.allSettled(
              PRECACHE_URLS.map(url => 
                  fetch(url).then(res => {
                      if(res.ok) return cache.put(url, res);
                      console.warn('[SW] Failed to precache', url);
                  }).catch(err => console.warn('[SW] Precache fetch error', url, err))
              )
          );
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore Firestore/Firebase/Auth requests
  if (url.hostname.includes('googleapis.com') || 
      url.pathname.includes('/firestore/') ||
      url.pathname.includes('/forwardAuthCookie')) {
    return;
  }

  // 2. Ignore External CDNs (Tailwind, FontAwesome, etc) to avoid opaque response issues
  if (url.hostname === 'cdn.tailwindcss.com' || 
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('esm.sh')) {
      return;
  }

  // 3. Network First for everything else (Safest for SPA)
  event.respondWith(
    fetch(event.request)
      .then(response => {
          // Clone and cache successful GET responses from our origin
          if (response && response.status === 200 && response.type === 'basic' && event.request.method === 'GET') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
              });
          }
          return response;
      })
      .catch(() => {
          // Offline fallback
          return caches.match(event.request)
              .then(cachedRes => {
                  if (cachedRes) return cachedRes;
                  // Optional: Return a custom offline page here if needed
                  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
              });
      })
  );
});
