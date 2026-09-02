'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useCachedData — stale-while-revalidate client data cache.
 *
 * - Instant paint from memory → localStorage (survives WebView restarts)
 * - Background revalidation when stale (TTL)
 * - Cross-component invalidation via invalidateCache('prefix') — call after
 *   any write that changes the underlying data (e.g. recipe saved).
 *
 * Usage:
 *   const { data, loading, refreshing, refresh } = useCachedData(
 *     `recipes:user:${userId}`,
 *     async () => { ...fetch...; return rows },
 *     { ttlMs: 10 * 60 * 1000 }
 *   )
 */

const memoryCache = new Map() // key -> { data, ts }
const INVALIDATE_EVENT = 'mintyfit:cache-invalidate'

function readStorage(key) {
  try {
    const raw = localStorage.getItem(`mcache:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.ts !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(key, data) {
  try {
    localStorage.setItem(`mcache:${key}`, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // Quota exceeded or storage unavailable — memory cache still works
  }
}

/** Invalidate all cache entries whose key starts with `prefix`. */
export function invalidateCache(prefix) {
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) memoryCache.delete(k)
  }
  try {
    const toDelete = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(`mcache:${prefix}`)) toDelete.push(k)
    }
    toDelete.forEach(k => localStorage.removeItem(k))
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INVALIDATE_EVENT, { detail: { prefix } }))
  }
}

export function useCachedData(key, fetcher, { ttlMs = 5 * 60 * 1000 } = {}) {
  const [data, setData] = useState(() => {
    if (!key) return null
    const mem = memoryCache.get(key)
    if (mem) return mem.data
    return readStorage(key)?.data ?? null
  })
  const [loading, setLoading] = useState(!!key && !data)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refresh = useCallback(async () => {
    if (!key) return
    setRefreshing(true)
    setError(null)
    try {
      const fresh = await fetcherRef.current()
      memoryCache.set(key, { data: fresh, ts: Date.now() })
      writeStorage(key, fresh)
      setData(fresh)
      setLoading(false)
    } catch (err) {
      setError(err)
    } finally {
      setRefreshing(false)
    }
  }, [key])

  useEffect(() => {
    if (!key) return
    const mem = memoryCache.get(key)
    const stored = mem || readStorage(key)
    if (stored) {
      setData(stored.data)
      setLoading(false)
      if (Date.now() - stored.ts < ttlMs) return // fresh enough
    }
    refresh()
  }, [key, ttlMs, refresh])

  // Revalidate when another component invalidates this key's prefix
  useEffect(() => {
    if (!key) return
    function onInvalidate(e) {
      if (key.startsWith(e.detail?.prefix || '')) refresh()
    }
    window.addEventListener(INVALIDATE_EVENT, onInvalidate)
    return () => window.removeEventListener(INVALIDATE_EVENT, onInvalidate)
  }, [key, refresh])

  return { data, loading, refreshing, error, refresh }
}
