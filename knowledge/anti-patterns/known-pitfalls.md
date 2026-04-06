# Known Pitfalls

> Things that have broken before or fail silently. Check this before making changes.

## Auth & Data

- **profile_id null on recipe insert**: If you rely on React context for the current user at save time, the user object may not be hydrated yet. Always use `supabase.auth.getUser()` at the moment of insert inside a Server Action.
- **Stale session in Server Components**: Always call `supabase.auth.getUser()` — not `supabase.auth.getSession()`. `getSession()` reads from cache and can be stale. `getUser()` validates against the server.

## Schema

- **`image_thumb_url` not in migration**: The column is used in code but was never added via a formal migration in v1. Ensure it's in the v2 migration from the start.
- **`recipe_member_states` partially redundant**: Overlaps with `calendar_entries.member_id`. Could be consolidated — currently both are used; do not add a third similar structure.

## Nutrition Logic

- **Never duplicate BMR calculation**: `computeBMR()` lives ONLY in `lib/nutrition/portionCalc.js`. Writing a second BMR function will cause divergent nutrition numbers across the app.
- **Statistics does NOT calculate**: It only reads `personal_nutrition` from calendar entries. If you add calculation logic to Statistics, nutrition will be double-counted.
- **Journal entries have no BMI scaling**: They are facts (exact amounts eaten), not plans. Do not apply portion scaling.

## Next.js App Router

- **Mixing Server and Client in same file**: A file with `'use client'` cannot have `async` server-side data fetching. If you need both, split into a Server Component wrapper and a Client Component leaf.
- **`cookies()` in Client Components**: `cookies()` from `next/headers` only works in Server Components and Server Actions. Client Components cannot read cookies directly.
- **Forgot `'use client'` on event handlers**: A Server Component that uses `onClick`, `onChange`, etc. will throw at build time. Move interactive logic to a Client Component.

## Build & Deploy

- **`eslint: { ignoreDuringBuilds: true }`**: Convenient during dev but masks real issues. Remove before production or at least review lint output separately.
- **Environment variables prefix**: Browser-accessible vars must be `NEXT_PUBLIC_`. Server-only vars have no prefix. Never put secret API keys in `NEXT_PUBLIC_` vars.

---
*Last updated: 2026-04-06*
*Confidence: High — learned from v1 and Next.js patterns*
