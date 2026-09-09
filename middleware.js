import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PROTECTED_PATHS = [
  '/plan',
  '/statistics',
  '/my-account',
  '/my-family',
  '/shopping-list',
  '/nutritionist',
  '/admin',
]

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))

  // Anonymous fast path: without a Supabase auth cookie (sb-*) no session can
  // exist, so skip the getUser() network round trip entirely. Most site traffic
  // is anonymous — this removes auth latency from every public page view.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-'))

  if (!hasAuthCookie) {
    if (isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'login')
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser()

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'login')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
