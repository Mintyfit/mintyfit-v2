# Styling Conventions

## Current Approach
- **Tailwind CSS 4** utility classes — primary styling method
- CSS custom properties for theming in `app/globals.css`:
  - Backgrounds: `--bg-page`, `--bg-card`, `--bg-nav`, `--bg-subtle`, `--bg-active`
  - Text: `--text-1` through `--text-4`, plus `--text-xs` … `--text-2xl` and `--text-2xs`
  - Borders: `--border`, `--border-light` (cards & dividers ONLY — see below)
  - Interactive controls: `--control-line`, `--control-check`, `--control-action`, `--tap-min`
- Dark mode: `.dark` class on `<html>`, toggled via ThemeContext, persisted to localStorage

## Color Palette
- Primary green: `#3D8A3E` (buttons, active states, brand)
- Accent purple: `#7C3AED` (calendar slots, premium features)
- Font: Montserrat (loaded via Next.js `localFont` in `app/layout.jsx`)

## Root font size
`app/globals.css` sets `html { font-size: 17px }` (18px below 767px, 18.5px below 380px).
Almost every component declares sizes inline in `rem`, so the root scales the whole app.
This was done because Android WebView defaults to ~14-15px and text came out too small.

**Consequence — the rule that matters:**
> Anything sized in **raw `px` does not scale** with that root bump.

This is not theoretical: ingredient checkboxes were `width: 14` and swap buttons
`width: 22` in raw px while the surrounding text used `rem`. Text grew, controls
stayed at 2.4 mm / 3.8 mm on the glass and were effectively untappable. Fixed
2026-09-25 (see `knowledge/sessions/2026-09-25-mobile-control-visibility.md`).

### Interactive control sizing — always the tokens, never px
```jsx
// Correct - scales with the root font-size
<span style={{ width: 'var(--control-check)', height: 'var(--control-check)' }} />
<button style={{ width: 'var(--control-action)', height: 'var(--control-action)' }} />
<div  style={{ minHeight: 'var(--tap-min)' }} />

// Wrong - frozen at 14px forever
<span style={{ width: 14, height: 14 }} />
```
| token | value | purpose |
|---|---|---|
| `--control-check` | `1.25rem` | checkbox glyph |
| `--control-action` | `2.25rem` | round action button (swap/replace, delete) |
| `--tap-min` | `2.75rem` | minimum touch target (WCAG 2.5.5, 7 mm) |

If a checkbox is purely decorative inside a pill/label, size it `--control-check` and
let the surrounding pill/label carry `--tap-min`. If the checkbox **is** the button,
size it `--control-action`.

## Control contrast — never `--border` / `--text-4`
WCAG 1.4.11 requires **3:1** for the boundary of an interactive control.

| token | on `--bg-card` | dark, on `--bg-card` | verdict |
|---|---|---|---|
| `--border` `#e5e7eb` | 1.24:1 | 1.41:1 | **fail — invisible** |
| `--text-4` `#9ca3af` | 2.54:1 | 5.7:1 | **fail in light** |
| `--control-line` `#6b7280` | 4.83:1 | 9.85:1 (`#cbd5e1`) | pass |

```jsx
// Correct
border: `2px solid ${active ? 'var(--primary)' : 'var(--control-line)'}`,
color:   active ? '#fff' : 'var(--control-line)',

// Wrong - 1.24:1, the user literally cannot see it
border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
color:   active ? '#fff' : 'var(--text-4)',
```
`--border` and `--border-light` remain correct for **cards, panels, dividers and input
fields** — decorative chrome where 3:1 does not apply.

## Typography floor
- Readable text floor: `--text-2xs` = `0.8125rem`. Nothing a user must read goes below it.
- `--text-xs` = `0.75rem` is allowed only for uppercase badges / decorative markers.
- Raw `px` font sizes are banned — convert to `rem` (`14px` -> `0.875rem`, `16px` -> `1rem`).
- Large decorative emoji glyphs (`40px`/`48px`/`64px`) and responsive `clamp()` hero
  headings are the only acceptable non-`rem` values.

## Responsive Strategy
- Mobile: bottom navigation bar
- Desktop: top navigation bar
- Mobile-first breakpoints via Tailwind (`sm:`, `md:`, `lg:`)
- Recipe detail layout switches at 780px (`.hide-mobile-780` / `.show-mobile-780`)

## Component Styling Rules
- Use Tailwind utility classes directly — no CSS modules for new components
- CSS custom properties (`var(--bg-card)`) for colors that change with dark mode
- Avoid inline styles except for truly dynamic values (e.g., widths from JS calculations)
- Prefer `gap-*` over `margin` for spacing between flex/grid children

## Dark Mode
```jsx
// Correct — uses CSS custom properties, auto-responds to .dark class
<div className="bg-[var(--bg-card)] text-[var(--text-1)]">

// Avoid — hardcoded colors that don't respond to dark mode
<div className="bg-white text-gray-900">
```

## Gotcha: `app/globals.css` encoding
That file contains literal `?` (0x3F) mojibake where em-dashes/en-dashes once were, and
uses CRLF line endings. When editing it, match **ASCII-only** anchors and never paste
rendered glyph output back into a search string.

---
*Last updated: 2026-09-25*
