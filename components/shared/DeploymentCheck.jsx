'use client'

import { useEffect } from 'react'

/**
 * DeploymentCheck — keeps the Android WebView (and any aggressively caching
 * client) on the current deployment.
 *
 * The root layout renders an inline script with the serving deployment's id
 * as window.__MINTY_BUILD__. When the app was loaded from a stale WebView
 * HTTP cache, that baked-in id is the OLD build's — while /api/version
 * (no-store) reports the NEW one. On mismatch we navigate to a cache-busting
 * URL (new query param = new cache key = guaranteed network fetch), which
 * pulls fresh HTML and, with it, the new hashed JS/CSS chunks.
 *
 * Loop guards: skip when the current URL already carries _fresh, and only
 * reload once per target version per session.
 */
export default function DeploymentCheck() {
  useEffect(() => {
    const loadedBuild = window.__MINTY_BUILD__
    // Local dev has no deployment id — nothing to check.
    if (!loadedBuild || loadedBuild === 'dev') return

    let stopped = false

    async function check() {
      if (stopped) return
      let version
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        version = (await res.json())?.version
      } catch {
        return // offline or transient failure — try again next tick
      }
      if (!version || version === 'dev' || version === loadedBuild) return
      if (new URLSearchParams(window.location.search).has('_fresh')) return
      const flag = `minty:reloaded-for:${version}`
      try {
        if (sessionStorage.getItem(flag)) return
        sessionStorage.setItem(flag, '1')
      } catch { /* storage unavailable — still reload */ }
      const url = new URL(window.location.href)
      url.searchParams.set('_fresh', Date.now().toString(36))
      window.location.replace(url.toString())
    }

    check()
    const interval = setInterval(check, 5 * 60 * 1000)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      stopped = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [])

  return null
}
