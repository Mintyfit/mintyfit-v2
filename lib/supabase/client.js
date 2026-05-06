'use client'

import { createBrowserClient } from '@supabase/ssr'

let client

/**
 * Returns a singleton Supabase browser client.
 * Safe to call multiple times — always returns the same instance.
 */
export function createClient() {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.log('[Supabase Client] URL:', url ? url.substring(0, 25) + '...' : 'MISSING')
  console.log('[Supabase Client] Key exists:', !!key, 'Length:', key?.length)
  if (!url || !key) {
    console.error('[Supabase Client] Missing env vars!')
    return null
  }
  client = createBrowserClient(url, key)
  console.log('[Supabase Client] Client created successfully')
  return client
}
