# 2026-09-14 — All images broken site-wide: Vercel optimizer quota → pre-sized variants

## Symptom
/menus (and every `next/image` image site-wide: recipes, planner, menu detail) showed gray boxes with alt text. Blog images worked (plain `<img>`).

## Diagnosis
- NOT an old-Supabase problem. All menu/recipe images live in the current project's `recipe-images` bucket (migrated 2026-09-03), publicly accessible (direct URL → 200).
- The failure was Vercel's Next.js image optimizer: `/_next/image` returned **HTTP 402 `OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`** — Hobby plan monthly optimization quota exhausted. Every `<Image>` component broke at once.
- Detection recipe: fetch page HTML → find `/_next/image?url=...` srcs → curl one directly. 402 + that error code = quota, not config/404.

## Decision
Rejected: (a) upgrade Vercel Pro, (b) custom sharp optimizer route (`/api/image` + custom loader — built, tested, then removed at user's direction: no runtime optimizing services at all).
Chosen: **pre-sized variants at write time** — storage already holds `-detail.jpg` + `-thumb.jpg` per image; serve thumbs on cards, detail on heroes, plain `<img>` everywhere.

## Changes (all next/image removed from the codebase)
- `components/menus/MenusClient.jsx` — card → `menu.image_thumb_url || menu.image_url`, plain `<img loading="lazy">`
- `components/menus/MenuDetailClient.jsx` — hero → `menu.image_url` `<img fetchPriority="high">`; RecipeRow already picked thumb
- `components/recipes/RecipeCard.jsx` — `cardImg = recipe.image_thumb || recipe.image`
- `components/recipes/RecipeDetailClient.jsx` — hero → `<img fetchPriority="high">`
- `components/recipes/RecipeGeneratorClient.jsx` — preview → `<img fetchPriority="high">`
- `components/planner/RecipePickerModal.jsx` — thumb-preferred `<img>`
- `components/planner/DayAgenda.jsx` — slot thumbs → `image_thumb_url || image_url`
- `components/planner/PlannerClient.jsx` — ENTRIES_SELECT + pending-recipe select gained `image_thumb_url`
- `components/planner/PlannerSidebar.jsx` — recipe selects gained `image_thumb_url`; 36px imgs now use thumbs (was pulling ~65KB detail images into 36px slots)
- `sharp` moved back to devDependencies (scripts-only again)

## Verified
- `next build` clean; local `next start`: /menus renders 6 cards with direct thumb URLs, /recipes 72 thumbs, **zero `_next/image` refs** in either page; thumb URLs return 200 (~20KB).

## Notes / gotchas
- `next.config.mjs` `images.remotePatterns` is now dead config — harmless, left in place in case `next/image` ever returns. **Do not reintroduce `next/image` without a plan for the optimizer quota.**
- The `image_thumb_url || image_url` fallback pattern was already established (`normalizeRecipe`, StatisticsClient, `/api/assistant`) — new image renders should follow it.
- Thumb naming is not uniform: new uploads `{id}-thumb.jpg` / migrated rows `menus-{id}-image_thumb_url.jpg` — always read the DB columns, never derive filenames by string munging.
