// Diamond Stats - Service Worker
// Network-first for everything: always get latest code, cache as offline fallback

const CACHE_NAME = 'diamond-stats-v4';

// Install: activate immediately
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate: claim all clients and clear ALL old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: network-first for everything
// Only falls back to cache when offline (at the ballpark with no signal)
self.addEventListener('fetch', (event) => {
    event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        // Cache successful responses for offline fallback
        if (response.ok && request.method === 'GET') {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Offline: try cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // Offline fallback for navigation: serve cached index.html
        if (request.mode === 'navigate') {
            const indexCached = await caches.match(new Request(self.registration.scope));
            if (indexCached) return indexCached;
        }

        return new Response(
            JSON.stringify({ error: 'offline', reason: 'No network connection' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
