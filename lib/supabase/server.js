import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Automatically reads/writes session cookies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies can be read but not written here.
            // Middleware handles session refresh.
          }
        },
      },
    }
  )
}

/**
 * A lightweight read-only Supabase client for public data fetching in
 * generateStaticParams / ISR contexts where cookies are unavailable.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Server-only admin client that bypasses RLS using the service role key.
 * Safe for use only in server components and server actions — never in client code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
    { auth: { persistSession: false } }
  )
}
