'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker (production only).
 * No-ops in dev so HMR isn't fighting a cache layer.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // SW registration must never break the app
    })
  }, [])

  return null
}
