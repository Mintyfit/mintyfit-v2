# Session — 2026-10-12 — Recipe instructions split into numbered sub-steps

**Scope:** `lib/recipe/instructionSteps.js` (new), `components/recipes/InstructionText.jsx` (new), `components/recipes/RecipeDetailClient.jsx`, `components/recipes/RecipeGeneratorClient.jsx`, `SYSTEM.md`

## What happened

User reported recipe step instructions are one hard-to-follow wall of text (screenshot: "Prepare banana pancake batter" step with a 6-sentence paragraph). Root cause is by design, not a bug: the generation prompts (`lib/recipe/recipeGenerator.js`, `/api/recipe/edit`) enforce a **40–80-word single `instruction` string per step**.

**Decision:** display-time sentence splitting, NOT a schema change or data migration. The stored `instruction` stays one string; the UI splits it into sentences at render. This fixes ALL existing recipes instantly with zero migration cost, and JSON-LD `recipeInstructions` output (which should keep full text for SEO) is untouched.

**Format decision:** numbered sub-steps (user's explicit choice over bullets) so sub-steps can be referenced — "step 2, point 3".

## Implementation

- `lib/recipe/instructionSteps.js` — `splitInstructionSentences(text)`: splits after `. ! ?` when followed by whitespace + a new-sentence start (`[A-Z0-9"“]`). The lookahead keeps decimals ("10.5 oz"), lowercase abbreviations ("e.g. spinach") and semicolon continuations intact. No regex lookbehind (older Safari/WKWebView compat).
- `components/recipes/InstructionText.jsx` — shared renderer: >1 sentence → numbered `<ol>` (number in `--text-3`, same font-size as body so baselines align); ≤1 sentence → plain paragraph (unchanged look).
- Wired into `RecipeDetailClient` (main recipe page read view) and `RecipeGeneratorClient` (generation preview). Edit-mode textarea still edits the raw string — no change needed.

## Verified

- `npm run build` passes (75/75 pages).
- Splitter sanity-checked against the exact wall-of-text from the user's screenshot → 6 clean sentences.

## Notes

- If a future recipe has odd splits, the fix belongs in `splitInstructionSentences` (single source) — do not add per-page splitting hacks.
- Trailing punctuation is preserved on each sub-step.
