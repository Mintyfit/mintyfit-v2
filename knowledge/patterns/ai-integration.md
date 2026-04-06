# AI Integration Patterns

> How MintyFit v2 uses AI APIs (Claude, Grok, Ideogram).

## API Proxies

All AI calls go through Next.js API routes that inject API keys server-side:
- `app/api/claude/route.js` → Anthropic API (supports prompt caching via `cache_control`)
- `app/api/grok/route.js` → Grok API (journal food nutrition lookup)
- `app/api/ideogram/route.js` → Ideogram API (recipe images)

Never expose API keys to the client. All AI requests from client components POST to these routes.

## Recipe Generation Pipeline

1. `isFoodRelated()` guard — blocks non-food prompts
2. Single Claude Haiku call → returns full recipe JSON (title, ingredients, steps, servings)
3. Parallel: nutrition estimation (USDA first, Claude Haiku fallback) + image generation (Ideogram)
4. Image resize + upload to Supabase Storage
5. Insert into `recipes` table using Server Action (auth.getUser() at insert time)

## Nutrition Estimation

Two-tier approach in `lib/nutrition/nutrition.js`:
1. **USDA FoodData Central** (5s timeout, parallel ingredient lookups) — preferred
2. **Claude Haiku AI estimation** (10s timeout) — fallback when USDA has no match

47 nutrients tracked per recipe. Stored as `{ totals, perServing }` JSONB on the recipe row.

## Journal AI

User describes a meal in free text → Grok parses → estimates nutrition per ingredient → user reviews → saves to `food_journal` table.

## Prompt Caching (Claude)

For long system prompts (recipe generation, nutrition estimation), use Anthropic's prompt caching:
```js
{ role: 'system', content: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }] }
```
Reduces cost ~90% on repeated calls with same system prompt.

---
*Last updated: 2026-04-06*
*Confidence: High — carried over from v1, adapted for v2 API routes*
