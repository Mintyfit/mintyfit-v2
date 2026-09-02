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
  if (!url || !key) {
    console.error('[Supabase Client] Missing env vars')
    return null
  }
  client = createBrowserClient(url, key)
  return client
}
