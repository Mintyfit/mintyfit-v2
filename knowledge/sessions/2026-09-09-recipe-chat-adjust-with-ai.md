# Session — "Adjust with AI" recipe chat + mobile image move

**Date:** 2026-09-09
**Scope:** `app/api/recipe/edit/route.js` (new), `components/recipes/RecipeChatPanel.jsx` (new), `components/recipes/RecipeDetailClient.jsx`, `app/globals.css`, `SYSTEM.md`

## What the user asked for
1. Add a chat window to the single-recipe view so the user can change the recipe by describing it.
2. The changed recipe should always be private to its maker and must NOT pile up a duplicate on every change — one private copy of the original per user.
3. Move the recipe image to directly under the heading — **mobile view only**.

## Design decisions
- **Preview-then-apply, never blind-apply.** Editing a stored recipe is destructive and the planner's `personal_nutrition` depends on it. The LLM rewrite is shown as a preview card (title + change summary + ≈kcal/protein per serving); the user clicks **Apply** or **Discard**. Apply re-calls the route with `apply:true`.
- **"One private copy" via `forked_from_id`.** The column already existed (migration 023). The route resolves an *edit target*: owner → edit in place; non-owner → find their single existing private fork (`forked_from_id = original.id AND profile_id = user`) and update it, else create ONE fork titled `"{title} (My Version)"`, `is_public=false`, on first apply. Repeated edits reuse the same copy.
- **LLM = Claude Haiku** (`claude-haiku-4-5-20251001`), called directly in the route (same pattern as `/api/assistant`). Surgical rewrite prompt preserves the step shape and the 40–80-word instruction quality bar, and returns a `change_summary`.
- **Nutrition re-estimated server-side** with `getNutritionData(newSteps, newServings)` (write-time single source of truth per AGENTS.md). On failure it keeps the previous nutrition.
- **Gating:** `canUseVoiceAssistant(tier)` (pro/family/nutritionist) + `enforceUsageLimit('assistant')`. Free users see a paywall teaser.
- **Chat placement:** an "✨ Adjust with AI" toggle button in the action row (next to Add to Plan / Shopping List) that opens `RecipeChatPanel` inline below the buttons — per user choice (not a FAB, not the sidebar).
- **Mobile image:** image block lifted out of `rd-main` and rendered directly under the meta pills, shown only ≤780px via a new `show-mobile-780`/`hide-mobile-780` helper pair (the recipe layout switches at 780px, not the global 767px). Desktop image kept at top of `rd-main` with `hide-mobile-780`.

## Files created
- `app/api/recipe/edit/route.js` — POST `{recipe_id, instruction, apply?}`. Modes: preview (default) / apply. Owner-or-fork resolution + Haiku rewrite + nutrition re-estimate + persist. `toClientShape()` maps a DB row to the flat shape the detail client uses.
- `components/recipes/RecipeChatPanel.jsx` — chat UI (messages, input row, preview card with Apply/Discard, applied state, paywall teaser). `onApplied(updatedRecipe, result)` callback.

## Files modified
- `components/recipes/RecipeDetailClient.jsx` — import panel, `showRecipeChat` state, "✨ Adjust with AI" button in the action row, panel render + `onApplied` (setRecipe, `invalidateCache('recipes:')`, `router.push` to the new slug when a fork was created), image block moved to under-the-heading (mobile) + kept in `rd-main` (desktop).
- `app/globals.css` — added `hide-mobile-780` / `show-mobile-780` media helpers at the 780px breakpoint.
- `SYSTEM.md` — AI providers table row for `/api/recipe/edit`; recipes/ components line.

## Gotchas / notes for future sessions
- **The existing `/api/recipe/fork` route is stale/broken** — it inserts non-existent columns (`image`, `base_servings`, `created_by`, `tags`) and omits the NOT-NULL `profile_id`. Real columns: `profile_id`, `image_url`, `image_thumb_url`, `servings`, `prep_time_minutes`, `cook_time_minutes`. The new edit route does its own clean fork and does NOT call that route. Consider fixing or deleting `/api/recipe/fork` separately.
- Client component does dynamic `import('@/hooks/useCachedData')` for `invalidateCache` (matches existing pattern in RecipeDetailClient) — avoids adding it to the top-level import graph.
- When a fork is created the client `router.push`es to the new slug so the URL/back-button match the viewed recipe.

## Verification
- `npm run build` green: compiled 6.4s, lint+types pass, `/api/recipe/edit` registered (260 B), `/recipes/[slug]` 16.2 kB.
- Live LLM round-trip NOT exercised (needs an authenticated paid session). Manual check: open a recipe → "Adjust with AI" → describe a change → preview card → Apply → confirm owner recipe updated in place, or non-owner gets a "(My Version)" fork and is navigated to it; re-edit reuses the same fork (no duplicate rows).
