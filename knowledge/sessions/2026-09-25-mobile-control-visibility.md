# Session: Mobile control visibility (checkboxes, swap icon, type floor)
**Date**: 2026-09-25
**Duration**: ~2h
**Task**: User reported that on a real phone the recipe-detail texts are very small and the checkboxes + the ingredient-replace (swap) icon are "barely visible", yet screenshots of the same screen look normal. Diagnose and fix.

## What Was Done
- Diagnosed the cause from DSLR photos of a real device (`D:\WORKS\Minty\Ekraaninäidised`, 6016x4016, `_DSC1817..1821.JPG`) plus a code audit.
- Added control sizing + chrome tokens to `app/globals.css`:
  - `--control-check: 1.25rem`, `--control-action: 2.25rem`, `--tap-min: 2.75rem`, `--text-2xs: 0.8125rem`
  - `--control-line: #6b7280` (light) / `#cbd5e1` (dark)
- Phase 1 (controls) — `RecipeDetailClient.jsx`, `ShoppingListClient.jsx`, `DayAgenda.jsx`, `DayMacroBreakdown.jsx`:
  - checkbox `width/height: 14` (raw px) -> `var(--control-check)`, border `1.5px --border` -> `2px --control-line`
  - swap button `width/height: 22` -> `var(--control-action)`, glyph `0.625rem --text-4` -> `0.875rem --control-line`
  - ingredient pill padding `0.2rem 0.65rem 0.2rem 0.45rem` -> `0.5rem 0.75rem 0.5rem 0.55rem`, outline `--border` -> `--control-line`
  - "Who's eating?" chips: removed `opacity: 0.7`, border -> `--control-line`, `minHeight: var(--tap-min)`
  - "Meals today" 1-5 selector: border -> `--control-line`, `minWidth/minHeight: 2.25rem`
  - `ShoppingListClient` checkbox is its own tap target -> `--control-action` (7.0 mm)
- Phase 2 (typography, app-wide, 28+ files):
  - Floor raised: `0.6/0.625/0.6875/0.72rem` and raw `11/12/13px` -> `0.8125rem` for readable text, `0.75rem` for uppercase badges
  - Raw `px` font sizes `14/15/16/18/20/22/26/28px` -> `rem` so they scale with `html { font-size }`
- Verified: `npm run build` passes; tokens present in built CSS with correct values; `var(--control-*)` refs present in built JS; contrast recomputed programmatically; headless-Chrome harness rendered at 393x760 @ DPR 3.

## Findings

### What Worked
- Measuring the physical problem from the photos (px-per-mm from the phone body in frame) instead of guessing. Confirmed body text was ~16 CSS px (fine) while the checkbox was 14 CSS px = 2.4 mm (not fine).
- **Reusing `--text-3` as the control chrome colour** instead of inventing a new grey. It already passes 3:1 in BOTH themes (4.83:1 light / 9.85:1 dark), so one token covers both and no dark-mode override logic is needed beyond one line.
- Keeping `--border` untouched for cards/dividers (272 usages) avoided a global visual regression.

### What Didn't Work
- `edit` tool failed on `app/globals.css` until I matched an ASCII-only anchor — the file contains literal `?` (0x3F) mojibake where em-dashes/en-dashes were, and CRLF endings. Never copy the rendered glyphs back into an `oldString`.
- A PowerShell sweep used `[regex]::Escape($k)` with `.Replace()` (literal, not regex) — `0.6875rem` etc. never matched because of the escaped dot. `String.Replace` must take raw literals.
- `Get-ChildItem -Recurse -Include *.jsx, *.js` in PS 5.1 also returned directories. Use `-File` + `Where-Object { $_.Extension -in '.jsx','.js' }`.
- `Get-Content`/`ReadAllText` intermittently hung for 60-120s on large files; a trivial `Write-Output` worked immediately. Workaround: retry with smaller reads.
- The `Read` tool served a **stale cached image** — three different PNG/JPG files all returned the identical phone photo. Workaround: verify images by `[System.Drawing.Image]::FromFile()` dimensions instead.

### Bugs Found
- Root cause of the report: interactive controls were sized in **hardcoded raw `px`** (`width: 14`, `width: 22`). `app/globals.css` bumps `html { font-size }` to 17/18/18.5px specifically so `rem` text scales, but raw px never participates — so text grew while checkboxes and swap buttons stayed microscopic.
- Second root cause: control chrome used `--border` `#e5e7eb` and `--text-4` `#9ca3af`, which measure **1.19:1** and **2.54:1** on the light surface. WCAG 1.4.11 needs 3:1. Dark mode was also broken: `--border` `#334155` on `--bg-card` `#1e293b` = **1.41:1**.
- `RecipeDetailClient.jsx:1406` had `opacity: 0.7` on unchecked "Who's eating?" chips, halving the contrast a second time (effective 1.99:1).

### New Knowledge
- **Why screenshots looked fine but the phone did not.** A screenshot is captured at device pixels (DPR ~3) and displayed on a monitor, so a 14 px checkbox appears as 42 image px and looks normal-sized. A photograph shows the glass at true scale: 14 CSS px on a 393 px / 68 mm screen = 2.4 mm. Screenshots systematically hide both undersized and low-contrast UI. **When reporting a mobile sizing/visibility problem, use a photo of the device, not a screenshot.**
- Contrast ratios measured (light surface):
  | token | on `--bg-card` | verdict |
  |---|---|---|
  | `--border` `#e5e7eb` | 1.24:1 | fail |
  | `--text-4` `#9ca3af` | 2.54:1 | fail |
  | `--control-line` `#6b7280` | 4.83:1 | pass |
  | dark `--border` `#334155` on `#1e293b` | 1.41:1 | fail |
  | dark `--control-line` `#cbd5e1` on `#1e293b` | 9.85:1 | pass |

## Recommendations

### Should be added to AGENTS.md (hot rules)
- **Never size interactive controls in raw `px`.** Use `var(--control-check)` / `var(--control-action)` / `var(--tap-min)` from `app/globals.css`. Raw px ignores the `html { font-size }` scale and is what made the mobile UI unreadable.
- **Never draw a control boundary with `--border` or `--text-4`.** Use `var(--control-line)` (>=3:1 in both themes). `--border` is for cards and dividers only.

### Should be added to knowledge/ (reference)
- `knowledge/conventions/styling.md`: document the control tokens and the >=3:1 rule.
- Gotcha: `app/globals.css` contains mojibake `?` glyphs and CRLF line endings; edit via ASCII-only anchors.

## Supersedes
- Nothing. `knowledge/conventions/styling.md` is being extended (not replaced).
