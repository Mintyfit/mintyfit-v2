# Component Design Patterns

> How MintyFit v2 structures its UI components.

## Server vs Client Components

Default to Server Components. Add `'use client'` only when the component needs:
- `useState` / `useReducer`
- `useEffect`
- Browser APIs
- Event listeners
- React context consumers

```
app/recipes/page.jsx          → Server Component (fetches data, renders list)
components/RecipeCard.jsx     → Server Component (pure display)
components/AddToPlanner.jsx   → Client Component (needs onClick, useState)
```

## Component Locations

| Location | Purpose |
|---|---|
| `components/` | Shared components (Navbar, Footer, cards, modals) |
| `components/auth/` | Auth modal, sign-in form, sign-up form |
| `components/home/` | Landing page sections |
| `components/shared/` | Tiny reusable pieces (Button, Badge, Spinner, etc.) |
| `app/` | Page-level components that are route-specific |

## No React Router DOM

Navigation uses Next.js `<Link>`, `useRouter()` from `next/navigation`, and `redirect()` from `next/navigation`. React Router DOM is NOT installed in v2.

## State Management

- No Redux/Zustand
- Server state: Supabase queries (fresh data from DB)
- UI state: `useState` in Client Components
- Persistent client state: `useLocalStorage` hook in `hooks/`
- Shared auth state: `AuthContext` (one context, at root)

## Data Flow for Interactive Pages

Pattern for pages like the Planner that need both server data and client interactivity:

```
app/plan/page.jsx (Server)
  └── fetches initial calendar data
  └── renders <PlannerClient /> with initial data as props

components/PlannerClient.jsx ('use client')
  └── receives initial data
  └── manages local state for UI interactions
  └── calls Server Actions for mutations
```

---
*Last updated: 2026-04-06*
*Confidence: High — established architecture*
