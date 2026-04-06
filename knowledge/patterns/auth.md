# Auth Patterns

> Authentication and authorization flows in MintyFit v2.

## Single Auth Context

MintyFit v2 has ONE `AuthContext` at `contexts/AuthContext.jsx`. It wraps the entire app via `app/layout.jsx`. Uses `lib/supabase/client.js` (the browser Supabase client).

No duplicate auth contexts — this was a pain point in v1 that v2 eliminates.

## Middleware

`middleware.js` protects routes using the Supabase middleware client:
- Protected: `/my-account`, `/generate`, `/nutritionist`, `/admin`, `/plan`, `/journal`, `/stats`
- Redirects unauthenticated users to `/?auth=login`
- Also refreshes the Supabase session on every request (required for SSR auth)

## Auth Flows

- **Sign up**: Email + password, or Google/Facebook OAuth
- **Sign in**: Same options
- **Password reset**: Supabase magic link flow
- **Session**: Cookie-based (Supabase SSR handles this automatically)

## Protected Pages Pattern

Server Components for protected pages:
```js
// app/plan/page.jsx
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PlanPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')
  // ... fetch data and render
}
```

## Roles

- `user` — Default for all registered users
- `nutritionist` — Can view assigned client data
- `super_admin` — Full admin access

Role stored in `profiles.role` column.

---
*Last updated: 2026-04-06*
*Confidence: High — established architecture*
