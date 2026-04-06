# Supabase Patterns

> How MintyFit v2 uses Supabase (auth, database, storage, edge functions).

## Single Client Setup

MintyFit v2 has ONE Supabase client setup in `lib/supabase/`:
- `lib/supabase/client.js` — Browser client (`@supabase/ssr` `createBrowserClient`)
- `lib/supabase/server.js` — Server client (`@supabase/ssr` `createServerClient`, reads cookies)
- `lib/supabase/middleware.js` — Middleware client for session refresh

All use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No VITE_ vars.

## RLS

- RLS is enabled on every table
- Most policies use `auth.uid() = profile_id` or join through `family_memberships`
- Public recipes: `is_public = true` bypass for SELECT
- Family data: policies check membership via `family_memberships` table

## Auth — Always Use Server Client for Inserts

When inserting records that need the current user's ID, use the server Supabase client or Server Action (which reads the session from cookies). Do NOT rely on React context user state at insert time — it may not be hydrated.

```js
// Correct — in a Server Action
const supabase = createServerClient()
const { data: { user } } = await supabase.auth.getUser()
```

## Storage

- Bucket: `recipe-images`
- Images uploaded after client-side resize
- Two sizes: full + thumbnail
- URL pattern: `recipe-images/[user_id]/[recipe_id]/[size].webp`

## Edge Functions

Located in `supabase/functions/`:
- `create-checkout` — Stripe checkout session
- `create-portal-session` — Stripe customer portal
- `stripe-webhook` — Handles Stripe events, updates `subscriptions` table

---
*Last updated: 2026-04-06*
*Confidence: High — established architecture*
