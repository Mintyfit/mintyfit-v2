/* MintyFit service worker — performance caching layer.
 *
 * Strategies:
 *  - App shell & fonts (/_next/static, /fonts): cache-first (immutable headers)
 *  - Images (static + Supabase storage + Ideogram CDN): cache-first, 30d expiry
 *  - PUBLIC pages only (/, /recipes, /menus, /blog, /pricing): network-first,
 *    cache kept ONLY as an offline fallback.
 *    (HTML must never be served stale-while-revalidate: cached HTML references
 *    content-hashed /_next/static chunks that disappear after a redeploy,
 *    causing missing CSS and ChunkLoadError crashes.)
 *  - Everything else (authenticated pages, /api/*, /auth/*): network-only
 *
 * Authenticated HTML is NEVER cached — per-user data must not leak across
 * sessions on a shared device.
 */

// Bump on every sw.js change — activate purges caches from older versions.
const VERSION = 'v2';
const STATIC_CACHE = `mintyfit-static-${VERSION}`;
const PAGES_CACHE = `mintyfit-pages-${VERSION}`;
const IMAGES_CACHE = `mintyfit-images-${VERSION}`;

const IMAGE_MAX_ENTRIES = 200;
const IMAGE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const PUBLIC_PAGES = /^\/$|^\/(recipes|menus|blog|pricing|pages)(\/|$)/;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isImage(request, url) {
  if (request.destination === 'image') return true;
  return /\.(png|webp|jpg|jpeg|gif|svg|ico|avif)(\?|$)/i.test(url.pathname);
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/');
}

function isPublicPage(url) {
  return PUBLIC_PAGES.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  return fetchAndCache(request, cache, {});
}

async function fetchAndCache(request, cache, { maxEntries } = {}) {
  const response = await fetch(request);
  if (!response.ok || response.status === 206) return response;

  // Buffer the body ONCE: a ReadableStream can only be consumed by one
  // reader, so we must never tee response.body into cache.put while also
  // returning the original response (that breaks the page's copy →
  // net::ERR_FAILED for JS/CSS chunks).
  const body = await response.blob();
  const meta = { status: response.status, statusText: response.statusText };

  // Store with a fetch timestamp header for expiry checks
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-at', String(Date.now()));
  await cache.put(request, new Response(body, { ...meta, headers }));

  if (maxEntries) {
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await cache.delete(keys[0]);
    }
  }
  return new Response(body, { ...meta, headers: response.headers });
}

// Network-first: online users always get fresh HTML whose chunk references
// match the current deployment. The cached copy is used only when offline.
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSupabaseImage = url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/');
  const isIdeogramImage = url.hostname.endsWith('ideogram.ai');

  // Never touch API calls or auth flows
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  if (sameOrigin && isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if ((sameOrigin && isImage(request, url)) || isSupabaseImage || isIdeogramImage) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES_CACHE);
        const cached = await cache.match(request);
        if (cached) {
          const fetchedAt = Number(cached.headers.get('sw-fetched-at') || 0);
          if (Date.now() - fetchedAt <= IMAGE_MAX_AGE_MS) return cached;
        }
        try {
          return await fetchAndCache(request, cache, { maxEntries: IMAGE_MAX_ENTRIES });
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Public page navigations: network-first, cache is offline fallback only
  if (sameOrigin && request.mode === 'navigate' && isPublicPage(url)) {
    event.respondWith(networkFirst(request, PAGES_CACHE));
    return;
  }
});
