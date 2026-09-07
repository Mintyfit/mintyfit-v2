/* MintyFit service worker — DISABLED / self-purging.
 *
 * The app (and any PWA) must always draw content fresh from the web — it must
 * NOT keep its own cache. Previous versions of this worker cached pages and
 * JS chunks, which let installed app shells hold a stale copy of the site
 * (old UI persisting after deploys). We no longer cache anything.
 *
 * This worker:
 *   1. Never intercepts fetches (no 'fetch' handler → network passthrough).
 *   2. On activate, unregisters itself and deletes every Cache Storage entry,
 *      purging any stale content cached by older worker versions.
 *
 * Keep this file deployed so existing clients update to it and self-clean.
 * Bumping VERSION forces every installed worker to update + purge.
 */

const VERSION = 'v3-nocache';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete every cache this origin ever created.
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        // Cache API unavailable — nothing to purge.
      }
      // Unregister so the worker stops existing for future loads.
      try {
        await self.registration.unregister();
      } catch {
        // Unregister failure is non-fatal; no fetch handler means no caching.
      }
      await self.clients.claim();
    })()
  );
});

// Intentionally NO 'fetch' event listener: all requests go straight to the
// network. The app shell and browsers therefore always serve fresh content.
