/* MintyFit service worker — performance caching layer.
 *
 * Strategies:
 *  - App shell & fonts (/_next/static, /fonts): cache-first (immutable headers)
 *  - Images (static + Supabase storage + Ideogram CDN): cache-first, 30d expiry
 *  - PUBLIC pages only (/, /recipes, /menus, /blog, /pricing): stale-while-revalidate
 *  - Everything else (authenticated pages, /api/*, /auth/*): network-only
 *
 * Authenticated HTML is NEVER cached — per-user data must not leak across
 * sessions on a shared device.
 */

const VERSION = 'v1';
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

  // Store with a fetch timestamp header for expiry checks
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-at', String(Date.now()));
  const stamped = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, stamped);

  if (maxEntries) {
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      await cache.delete(keys[0]);
    }
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await network) || cached || Response.error();
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

  // Public page navigations: stale-while-revalidate
  if (sameOrigin && request.mode === 'navigate' && isPublicPage(url)) {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }
});
