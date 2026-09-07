'use client'

import { useEffect } from 'react'

/**
 * ServiceWorkerCleanup — ensures NO service worker and NO Cache Storage
 * survives on any client.
 *
 * Product rule: the site (and the Android app shell wrapping it) must always
 * draw content fresh from the web — no client-side cache layer. Earlier sw.js
 * versions cached pages/chunks and caused stale-UI bugs (old app shell showing
 * pre-release UI after deploys).
 *
 * This component runs on every page load and:
 *   1. Unregisters every service worker registration for this origin.
 *   2. Deletes every Cache Storage entry for this origin.
 *
 * Combined with the self-purging /sw.js (no fetch handler, unregisters itself
 * on activate), this guarantees both update paths clean up: clients that load
 * a page (this component) and workers that self-update (sw.js).
 *
 * Must never throw — cleanup failure must not break the app.
 */
export default function ServiceWorkerCleanup() {
  useEffect(() => {
    ;(async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((r) => r.unregister()))
        }
      } catch { /* non-fatal */ }
      try {
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((k) => caches.delete(k)))
        }
      } catch { /* non-fatal */ }
    })()
  }, [])

  return null
}
