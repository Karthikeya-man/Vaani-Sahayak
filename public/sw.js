const CACHE_NAME = 'vaani-api-cache-v1';
const API_ROUTES_TO_CACHE = [
  '/api/weather',
  '/api/market',
  '/api/schemes'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const isApiToCache = API_ROUTES_TO_CACHE.some(route => url.pathname.startsWith(route));

  if (isApiToCache && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            const headers = new Headers(networkResponse.headers);
            if (!headers.has('X-Cached-At')) {
              headers.set('X-Cached-At', new Date().toISOString());
            }

            const blob = await networkResponse.clone().blob();
            const responseToCache = new Response(blob, {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              headers: headers
            });

            cache.put(event.request, responseToCache);
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            const headers = new Headers(cachedResponse.headers);
            if (!headers.get('X-Cached-At')) {
              headers.set('X-Cached-At', new Date().toISOString());
            }
            const blob = await cachedResponse.blob();
            return new Response(blob, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers
            });
          }
          return new Response(JSON.stringify({ error: 'Offline and no cached data available' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  }
});
