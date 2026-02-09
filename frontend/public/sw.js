// Diamond Stats - Service Worker
// Cache-first for static assets, network-first for API

const CACHE_NAME = 'diamond-stats-v2';

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
    // Skip pre-caching to avoid path issues with GitHub Pages
    // Assets will be cached on first fetch instead
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first for static, network-first for API/Supabase
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Supabase API requests: network-first
    if (url.hostname.includes('supabase.co') || url.hostname !== self.location.hostname) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Static assets: cache-first
    event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Offline fallback: return index.html for navigation requests
        if (request.mode === 'navigate') {
            const cached = await caches.match(new Request(self.registration.scope));
            if (cached) return cached;
        }
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch {
        return new Response(
            JSON.stringify({ error: 'offline', reason: 'No network connection' }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
