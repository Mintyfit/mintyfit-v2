import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const encoded = requestUrl.searchParams.get('t')

  if (!encoded) {
    return NextResponse.redirect(new URL('/login?error=Invalid+link', requestUrl.origin))
  }

  let accessToken, refreshToken
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
    if (!decoded.rt || !decoded.ts) throw new Error('Invalid token data')
    if (Date.now() - decoded.ts > 7 * 24 * 60 * 60 * 1000) {
      return NextResponse.redirect(new URL('/login?error=Link+expired', requestUrl.origin))
    }
    accessToken = decoded.at
    refreshToken = decoded.rt
  } catch {
    return NextResponse.redirect(new URL('/login?error=Invalid+link', requestUrl.origin))
  }

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

    // Set session from tokens — use access_token directly if valid, refresh if not
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken || '',
      refresh_token: refreshToken,
    })

    if (sessionError) {
      console.error('[handle-session] setSession error:', sessionError)
      // Try refreshing the token directly as fallback
      const { error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
      if (refreshError) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(sessionError.message)}`, requestUrl.origin)
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

      const needsOnboarding =
        !existingProfile ||
        existingProfile?.onboarding_pending ||
        user.user_metadata?.onboarding_pending

      return NextResponse.redirect(
        new URL(needsOnboarding ? '/onboarding' : '/', requestUrl.origin)
      )
    }

    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (err) {
    console.error('[handle-session] Error:', err)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`, requestUrl.origin)
    )
  }
}
