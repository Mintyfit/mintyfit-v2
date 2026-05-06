# Session: Theme Toggle Runtime Fix
**Date**: 2026-04-22
**Duration**: ~30m
**Task**: Resolve runtime `originalFactory is undefined` crash triggered at `ThemeToggle` in `app/layout.jsx`.

## What Was Done
- Reproduced and validated project state with `npm run build` before and after changes.
- Refactored root composition so `app/layout.jsx` stays a server shell and delegates providers/UI chrome to new client wrapper `app/providers.jsx`.
- Moved `ThemeProvider`, `AuthProvider`, `<main>`, and `ThemeToggle` into `app/providers.jsx`.
- Updated `SYSTEM.md` repository tree to document the new `app/providers.jsx` file.

## Findings

### What Worked
- Using a dedicated client `providers` wrapper cleanly isolates client-only providers/components from server layout boundaries.
- Full build verification catches invalid server-component patterns quickly.

### What Didn't Work
- Attempting `next/dynamic(..., { ssr: false })` directly in `app/layout.jsx` failed because Next.js disallows this in Server Components.

### Bugs Found
- Runtime crash around `ThemeToggle` on root render (`originalFactory` undefined), likely caused by client-factory resolution at the layout boundary in dev runtime.

### New Knowledge
- For root-level client providers/toggles, prefer `app/providers.jsx` (`'use client'`) and keep `app/layout.jsx` server-only.

## Recommendations

### Should be added to CLAUDE.md (hot rules)
- None.

### Should be added to knowledge/ (reference)
- Keep this session note as reference for future root layout/client boundary issues.

## Supersedes
- None.

- Follow-up: Renamed app provider wrapper to pp/client-providers.jsx to avoid potential module-name collision with legacy components/Providers.jsx during dev runtime resolution.

