# Session: Dark-Mode Token Fix (Pricing + Blog)
**Date**: 2026-09-07
**Duration**: ~15 min
**Task**: /pricing — plan cards ("price tabs") and FAQ invisible in dark mode

## What Was Done
- Root cause: components referenced CSS variables that don't exist (`--text-primary`, `--text-secondary`, `--card-bg`, `--border-color`, `--input-bg`), so in dark mode they fell back to hardcoded light-mode hex colors (e.g. `#111827` text on the dark `--bg-page`, and `color: inherit` = light text on a white-fallback card).
- Replaced all stale var names with the real theme tokens from `app/globals.css`:
  - `--text-primary` → `--text-1` (or `--text-2` / `--text-4` where the fallback matched those)
  - `--text-secondary` → `--text-3` (or `--text-4` for `#9ca3af` fallbacks)
  - `--card-bg` / `--input-bg` → `--bg-card`
  - `--border-color` → `--border`
- Files fixed: `components/pricing/PricingClient.jsx`, `app/blog/[slug]/page.jsx`, `components/blog/BlogListClient.jsx`, `components/blog/BlogEditorClient.jsx`
- Verified: grep shows zero remaining stale var names in `app/` and `components/`; `npm run build` passes (72/72 pages).

## Findings

### What Worked
- Token rename to the canonical vars — single source of truth in `globals.css` (`:root` light / `.dark` dark) now drives these pages correctly in both modes.

### Bugs Found
- `/pricing` plan cards and FAQ invisible in dark mode — root cause above. This was already listed as a known TODO in `MASTER-PLAN.md` line 143.

### New Knowledge
- The ONLY theme variables defined are in `app/globals.css`: `--bg-page`, `--bg-card`, `--bg-nav`, `--bg-subtle`, `--bg-active`, `--text-1..4`, `--border`, `--border-light`, `--shadow`, `--primary`, `--primary-hover`, `--accent`. Any other `--*` name silently falls back to its hardcoded light-mode default and breaks dark mode.
- Grep for `var(--` with names not in that list is a fast dark-mode audit.

## Recommendations

### Should be added to AGENTS.md (hot rules)
- Styling rule: only use CSS variables defined in `app/globals.css` (`--text-1..4`, `--bg-*`, `--border*`); never invent names like `--text-primary`/`--card-bg` — they silently break dark mode.

### Should be added to knowledge/ (reference)
- Dark-mode audit recipe: `grep "var(--" app components` and cross-check names against `globals.css`.

## Supersedes
- MASTER-PLAN.md line 143 TODO ("fix dark-mode var names on blog/pricing/pages") — now done.
