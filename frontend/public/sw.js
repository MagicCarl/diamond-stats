// Diamond Stats - Service Worker
// Cache-first for static assets, network-first for API

const CACHE_NAME = 'diamond-stats-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/variables.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/scorebook.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/api.js',
    '/js/router.js',
    '/js/sync.js',
    '/js/pages/login.js',
    '/js/pages/dashboard.js',
    '/js/pages/teams.js',
    '/js/pages/roster.js',
    '/js/pages/game-setup.js',
    '/js/pages/game-live.js',
    '/js/pages/boxscore.js',
    '/js/pages/stats.js',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
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

// Fetch: cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API requests: network-first with no cache fallback
    if (url.pathname.startsWith('/api') || url.hostname !== self.location.hostname) {
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
            return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch {
        // API calls that fail offline return a specific error
        return new Response(
            JSON.stringify({ error: 'offline', reason: 'No network connection' }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
