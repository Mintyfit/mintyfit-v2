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

  // Handle auth errors from Supabase
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    // Redirect to login with error message
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
        console.error('Failed to exchange code for session:', exchangeError)
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
        )
      }

      // Only redirect to onboarding when no explicit destination was requested
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Ensure profile row exists (no-op if already present, creates it for new users)
        const admin = createAdminClient()
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null
        await admin.from('profiles').upsert(
          { id: user.id, email: user.email, ...(fullName ? { full_name: fullName } : {}) },
          { onConflict: 'id', ignoreDuplicates: true }
        )

        if (next === '/') {
          const { data: profile } = await admin
            .from('profiles')
            .select('onboarding_pending')
            .eq('id', user.id)
            .single()

          if (profile?.onboarding_pending || user.user_metadata?.onboarding_pending) {
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
