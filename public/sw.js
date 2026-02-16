// GNews Service Worker - Cache Strategy
const CACHE_NAME = 'gnews-cache-v1';
const STATIC_CACHE = 'gnews-static-v1';
const API_CACHE = 'gnews-api-v1';
const IMAGE_CACHE = 'gnews-images-v1';

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/actu.html',
  '/jeux.html',
  '/game-details.html',
  '/mes-jeux.html',
  '/parametres.html',
  '/login.html',
  '/informations.html',
  '/css/style.css',
  '/css/actu.css',
  '/css/jeux.css',
  '/css/game-details.css',
  '/css/mes-jeux.css',
  '/css/parametres.css',
  '/css/login.css',
  '/js/app.js',
  '/js/actu.js',
  '/js/jeux.js',
  '/js/game-details.js',
  '/js/mes-jeux.js',
  '/js/parametres.js',
  '/js/login.js',
  '/js/auth-api.js',
  '/js/profile-menu.js',
  '/js/search-utils.js',
  '/js/cache-utils.js'
];

// API routes that can be cached (read-only GET endpoints)
const CACHEABLE_API_PATTERNS = [
  /^\/api\/news$/,
  /^\/api\/news\/game\//,
  /^\/api\/games\/trending/,
  /^\/api\/games\/upcoming/,
  /^\/api\/games\/new-releases/,
  /^\/api\/games\/discover/,
  /^\/api\/games\/search/,
  /^\/api\/games\/platform\//,
  /^\/api\/games\/\d+$/,
  /^\/api\/genres$/,
  /^\/api\/test-rawg$/
];

// API routes that should NEVER be cached (auth, mutations)
const NEVER_CACHE_PATTERNS = [
  /^\/api\/users\/(login|logout|register|auth-status|update|upload|verify|reset)/,
  /^\/api\/users\/favorites/,
  /^\/api\/users\/reviews/,
  /^\/api\/news\/refresh$/
];

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60,  // 7 days for static assets
  api: 10 * 60,               // 10 minutes for API responses
  images: 30 * 24 * 60 * 60   // 30 days for images
};

// ============================================
// INSTALL - Pre-cache static assets
// ============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch(err => {
          console.warn('[SW] Some static assets failed to cache:', err);
          // Cache what we can, don't fail install
          return Promise.allSettled(
            STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
          );
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATE - Clean up old caches
// ============================================
self.addEventListener('activate', event => {
  const currentCaches = [STATIC_CACHE, API_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !currentCaches.includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================
// FETCH - Serve from cache with strategy
// ============================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    // For external images (game covers, etc.), use cache-first
    if (isImageRequest(request)) {
      event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    }
    return;
  }

  // Never cache auth/mutation endpoints
  if (NEVER_CACHE_PATTERNS.some(p => p.test(url.pathname))) return;

  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    if (CACHEABLE_API_PATTERNS.some(p => p.test(url.pathname))) {
      event.respondWith(networkFirstStrategy(request, API_CACHE));
    }
    return;
  }

  // Images: Cache-first
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Static assets (HTML, CSS, JS): Stale-while-revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
});

// ============================================
// CACHE STRATEGIES
// ============================================

// Network-first: Try network, fall back to cache (best for API data)
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Clone response before caching (response can only be consumed once)
      const responseToCache = networkResponse.clone();
      // Add timestamp header for expiry check
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      const timedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      cache.put(request, timedResponse);
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return a fallback JSON for API requests
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache-first: Try cache, fall back to network (best for images)
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Check if cache is still valid
    const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
    if (timestamp) {
      const age = (Date.now() - parseInt(timestamp)) / 1000;
      if (age > CACHE_DURATIONS.images) {
        // Cache expired, fetch fresh
        return fetchAndCache(request, cacheName);
      }
    }
    return cachedResponse;
  }
  return fetchAndCache(request, cacheName);
}

// Stale-while-revalidate: Serve cache immediately, update in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch fresh copy in background
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  // Return cached version immediately, or wait for network
  return cachedResponse || fetchPromise;
}

// Helper: fetch and store in cache
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const headers = new Headers(response.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      const timedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      cache.put(request, timedResponse);
    }
    return response;
  } catch (error) {
    return new Response('', { status: 408, statusText: 'Network Error' });
  }
}

// Helper: check if request is for an image
function isImageRequest(request) {
  const url = request.url.toLowerCase();
  return url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?.*)?$/) ||
         request.destination === 'image' ||
         url.includes('/api/users/profile-picture/');
}

// ============================================
// PERIODIC CACHE CLEANUP
// ============================================
self.addEventListener('message', event => {
  if (event.data === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() => {
      console.log('[SW] API cache cleared');
    });
  }
  if (event.data === 'CLEAR_ALL_CACHE') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
      console.log('[SW] All caches cleared');
    });
  }
  if (event.data === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.source.postMessage({ type: 'CACHE_STATS', stats });
    });
  }
});

async function getCacheStats() {
  const stats = {};
  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    stats[name] = keys.length;
  }
  return stats;
}
