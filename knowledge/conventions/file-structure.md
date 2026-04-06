# File Structure Conventions

## Clean Next.js 15 Architecture

```
app/                    → Next.js App Router routes
  (public)/             → Public routes (home, recipes, blog, pricing)
  (protected)/          → Protected routes (plan, journal, stats, account)
  api/                  → API routes (AI proxies, webhooks)
  layout.jsx            → Root layout (providers, fonts, global styles)
  globals.css           → CSS custom properties, base styles
components/             → Shared UI components
  auth/                 → Auth modal, sign-in, sign-up
  home/                 → Landing page sections
  shared/               → Reusable primitives (Button, Badge, etc.)
contexts/               → React contexts (AuthContext, ThemeContext, FamilyContext)
hooks/                  → Custom hooks (useLocalStorage, useAuth, etc.)
lib/                    → Business logic, organized by domain
  supabase/             → Supabase client init (client.js, server.js, middleware.js)
  nutrition/            → Core nutrition logic (portionCalc, memberRDA, nutrition)
  recipe/               → Recipe generation, image handling
  journal/              → Journal entry helpers
  member/               → Family/member utilities
public/                 → Static assets
  images/               → Static images
  fonts/                → Local fonts (Montserrat)
supabase/               → Migrations + Edge Functions
  migrations/           → SQL migration files
  functions/            → Edge Functions (Stripe, etc.)
knowledge/              → Self-learning knowledge system (this directory)
```

## Where to Put New Files

| Creating... | Put it in... | Why |
|---|---|---|
| New page | `app/[route]/page.jsx` | Next.js App Router convention |
| New shared component | `components/` | Shared across pages |
| New business logic | `lib/[domain]/` | Domain-organized library code |
| New API route | `app/api/[route]/route.js` | Next.js API routes |
| New Server Action | `app/[route]/actions.js` | Co-located with the route |
| New hook | `hooks/` | Reusable React hooks |
| New context | `contexts/` | React context providers |

## What NOT to Create

- No `src/` directory — all code lives at root level
- No `pages/` directory — App Router only
- No React Router DOM — use Next.js navigation exclusively
- No separate Vite config — pure Next.js build

---
*Last updated: 2026-04-06*
