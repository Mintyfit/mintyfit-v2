import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  let next = requestUrl.searchParams.get('next') ?? '/'

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            },
          },
        }
      )
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        // exchangeCodeForSession can fail for Admin API magic links (no PKCE verifier).
        // Fall back to: user may have a session set by Supabase's hosted verify page.
        // Check if they're already logged in via getUser before giving up.
        const { data: { user: fallbackUser } } = await supabase.auth.getUser()
        if (!fallbackUser) {
          return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
          )
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null

        const { data: existingProfile } = await admin
          .from('profiles')
          .select('id, onboarding_pending')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          await admin.from('profiles').upsert(
            { id: user.id, email: user.email, ...(fullName ? { full_name: fullName } : {}), onboarding_pending: true },
            { onConflict: 'id', ignoreDuplicates: true }
          )
        }

        if (next === '/') {
          const needsOnboarding =
            !existingProfile ||
            existingProfile?.onboarding_pending ||
            user.user_metadata?.onboarding_pending

          if (needsOnboarding) {
            next = '/onboarding'
          }
        }
      }
    } catch (err) {
      console.error('Callback error:', err)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`, requestUrl.origin)
      )
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
