# Session: Business Logic Transplant
**Date**: 2026-04-06
**Duration**: ~2 hours
**Task**: Transplant all core business utilities from `D:/WORKS/Minty/March2026/src/utils/` into the v2 `lib/` structure with v2-correct imports, and convert API routes to Next.js Route Handlers.

## What Was Done

### Supabase Infrastructure
- Created `lib/supabase/client.js` — singleton browser client via `@supabase/ssr` `createBrowserClient`, NEXT_PUBLIC_ vars only
- Created `lib/supabase/server.js` — three exports: cookie-based SSR client, public/ISR client, admin service-role client
- Created `middleware.js` — Supabase session refresh on all routes; updated protected path list for v2 (`/plan`, `/journal`, `/stats`)

### Context & Hooks
- Created `contexts/AuthContext.jsx` — single auth context with `user`, `profile`, `setProfile`, `loading`
- Created `hooks/useAuth.js` — re-export from AuthContext
- Transplanted `hooks/useFamily.js` — fixed supabase import pattern
- Transplanted `hooks/useProfile.js` — fixed supabase import pattern
- Transplanted `hooks/useSubscription.js` — fixed context import path

### Utility Libraries (lib/)
- Copied `lib/nutrition/portionCalc.js` — unchanged; single source of BMR/TDEE/BMI
- Copied `lib/nutrition/nutrition.js`, `usdaLookup.js`, `usdaNutrition.js` — unchanged
- Copied `lib/recipe/recipeGenerator.js` — fixed 4 imports
- Copied `lib/recipe/imageGeneration.js` — fixed 1 import
- Copied `lib/recipe/ingredientDatabase.js` — fixed 2 imports (supabase + cross-dir usdaNutrition)
- Copied `lib/recipe/ingredientSwap.js` — fixed 1 import (cross-dir ingredientDatabase)
- Copied `lib/recipe/ingredientDatabase.js` — fixed foodGroups import (same dir, already OK)
- Copied `lib/journal/openFoodFacts.js` — fixed 1 dynamic import
- Copied `lib/member/syncFamily.js` — fixed 3 imports
- Copied `lib/member/memberColors.js` — no imports to fix
- Rewritten `lib/stripe.js` — v2 pricing (Pro $4.99/mo, $39.99/yr; Family $7.99/mo, $59.99/yr); added FREE_LIMITS constant

### API Routes (Next.js Route Handlers)
- Converted `app/api/claude/route.js` — from Vercel handler to `export async function POST`; default model → claude-haiku-4-5-20251001
- Converted `app/api/grok/route.js`
- Converted `app/api/ideogram/route.js`
- Converted `app/api/proxy-image/route.js` — replaced `res.send(Buffer)` with `new NextResponse(buffer, { headers })`

### Verification
- `npm install` — 344 packages, 0 vulnerabilities
- `npm run build` — ✓ compiled successfully, all 4 API routes present

## Findings

### What Worked
- Copying files first, then fixing imports systematically worked well
- The singleton pattern `const supabase = createClient()` at module level is the correct v2 replacement for the old pre-initialized `export { supabase }` singleton
- `grep -rn "from ['\"]\.\./\|from ['\"]\./"` as a final check catches all remaining relative imports
- Reading a file with the Read tool before using Edit on it is required — Edit will fail otherwise if the file was written by Bash

### What Didn't Work
- Trying to Edit a file that was `cp`-copied without first using the Read tool causes "File has not been read yet" error

### Bugs Found
- `imageGeneration.js` was missed in the initial import scan — it used `../lib/supabase.js` (non-existent path in v2)
- `ingredientDatabase.js` imported `./usdaNutrition` but that file lives in `lib/nutrition/`, not `lib/recipe/`
- `openFoodFacts.js` had a dynamic `import('./ingredientDatabase.js')` that needed updating to `@/lib/recipe/ingredientDatabase`

### New Knowledge
- When converting `res.send(Buffer)` to NextResponse, use `new NextResponse(buffer, { headers })` — not `NextResponse.json()`
- `export const maxDuration = 60` must be at Route Handler module level for Vercel edge timeout extension
- Claude model ID for v2 default: `claude-haiku-4-5-20251001` (not the sonnet used in v1)
- `@supabase/ssr` `createBrowserClient` vs old `createClient` from `@supabase/supabase-js`: the SSR variant is required for Next.js App Router cookie handling

## Recommendations

### Should be added to CLAUDE.md (hot rules)
- Always use Read tool on a file before Edit, even if just written by Bash

### Should be added to knowledge/ (reference)
- The supabase client migration pattern (already covered in `knowledge/patterns/supabase.md`)
- Route Handler conversion pattern — could add to `knowledge/patterns/data-fetching.md`

## Supersedes
- Nothing — no prior session covered business logic
