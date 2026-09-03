'use client'

import { useEffect } from 'react'

// A deployment happened while this tab was open: the running build references
// chunks that no longer exist on the CDN. Only a full reload can fetch the
// fresh build. Reload at most once per 30s to avoid a reload loop.
function recoverFromChunkError(error) {
  const msg = error?.message || ''
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    /loading chunk|loading css chunk|dynamically imported module|module script/i.test(msg)
  if (!isChunkError) return
  try {
    const key = 'mf-chunk-reload-at'
    const last = Number(sessionStorage.getItem(key) || 0)
    if (Date.now() - last < 30000) return
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  } catch {
    // sessionStorage unavailable — fall through to manual "Try again"
  }
}

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Route error:', error)
    recoverFromChunkError(error)
  }, [error])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <p>Please try refreshing the page.</p>
      <button
        onClick={() => reset()}
        style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}
