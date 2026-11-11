# Session: iOS App Store submission prep + /pages/* 500 root-cause fix
**Date**: 2026-11-11
**Duration**: ~2h
**Task**: Prepare everything site-side for the iOS App Store submission (build 8): verify reviewer-facing contracts, fix what fails, demo account + screenshots, submit build 8.

## What Was Done
- **Found + fixed a guaranteed App Store rejection**: `https://mintyfit.com/pages/privacy-policy` (the listing's required Privacy Policy URL) returned **500 on every /pages/* route in production**. Root cause chain: SafeHtml (server component on pages/[slug]) → isomorphic-dompurify → jsdom → `html-encoding-sniffer` (CJS) → `require()` of ESM-only `@exodus/bytes` → `ERR_REQUIRE_ESM` hard-crashes the Vercel function. Local Node 24 has native `require(esm)`, so it NEVER failed locally. Blog survived because it uses SafeHtml inside a CLIENT component (fail-soft: content rendered only client-side — meaning blog SSR HTML was silently missing article bodies, an unnoticed SEO regression).
- Fix: SafeHtml now uses **sanitize-html (pure JS) in all environments** (server + SSR + hydration, identical output); isomorphic-dompurify/dompurify deps removed; `engines.node: 22.x` pinned (Vercel was on Node 20 — confirmed via probe `process.version` v20 → after fix v22.23.4; NOTE even Node 22 failed because Vercel's `/opt/rust/nodejs.js` runtime shim intercepts require). Verified live: /pages/* 200, blog SSR body back in initial HTML.
- Two wrong theories deployed first (pages-segment rename + serverExternalPackages) — reverted; the lesson is: **deploy a tiny probe route that reports the real error** (`/api/debug-pages-500` pattern: import each module of the failing graph in a route handler, return stack traces as JSON). Don't guess when Vercel logs are inaccessible (CLI token was expired).
- **Verified all iOS reviewer-facing contracts live**: AASA 200 (`54PA839S39.com.mintyfit.app`), Sign in with Apple Supabase provider live (Services ID `com.mintyfit.app.signin` — authorize endpoint 302s to appleid.apple.com), `/api/stripe/checkout` 403s `MintyFitApp-iOS` UA, delete-account route + UI present, openExternal on paid CTAs.
- **Submitted build 8** to ASC via `eas submit` (API-key auth, no interactive login needed): submission `1f32221a-4984-48ca-920c-538e5c6e50a8`, ASC App ID 6823647019.
- **Created the reviewer demo account** on production: `demo@mintyfit.com` (family tier, 1 adult + 2 managed kids Emma/Liam, 5 weight logs, 21 calendar entries for the 7 days around today with canonical `computeMealBudget` personal_nutrition). Script: `scripts/prepare-reviewer-account.mjs` (`--link-only` regenerates a fresh `/auth/handle-session?t=` sign-in link — tokens age ~7 days, regenerate right before hitting Submit in ASC).
- **App Store screenshots** (1290×2796 @3x) captured with playwright-core + local Chromium of the live site (shell renders web 1:1): `D:\WORKS\Minty\iOS\store-assets\screenshots\` (planner, recipe detail, statistics, my-family, landing). Script: `scripts/capture-app-store-screenshots.mjs <session-link>`.
- Paste-ready ASC pack: `D:\WORKS\Minty\iOS\store-assets\app-store-listing.md`.

## Findings

### What Worked
- Probe-route debugging for serverless-only crashes: import the failing module graph piece by piece inside a temporary route handler and return the stack as JSON. Got the exact root cause in ONE deploy after two theory-guesses failed.
- Headless reviewer login (`signInWithPassword` → base64url `{at, rt, ts}` → handle-session) verified end-to-end: 307 → `/` + `sb-*` cookie set.
- tsx with `--tsconfig jsconfig.json` runs repo libs (`@/` aliases resolve) in plain Node scripts — no logic duplication of computeMealBudget.

### What Didn't Work
- Guessing Vercel runtime failures without logs (segment-name theory, bundling theory) — both wrong; probe first next time.
- `git add <multiple paths>` aborts ATOMICALLY if any pathspec is stale — the engines/probe fix was silently left uncommitted while the rename went out alone (caught by checking `git diff --cached --name-only` output... which I skipped that round). ALWAYS check what actually got committed.

### Bugs Found
- /pages/* 500 (above) — the App Store listing URL itself was dead.
- MyFamilyClient mobile: "Invite" button overlaps "+ Add child" (visible in screenshot 4) — cosmetic, worth a fix pass.
- Local `next start` serves notFound() with HTTP 200 (minor, pre-existing).

### New Knowledge
- ESM-only transitive deps (`@exodus/bytes` era) hard-crash CJS require chains on Vercel even on Node 22 — Vercel's Rust runtime shim doesn't honor require(esm). Local Node 24 masks it entirely. Pin `engines.node` and prefer pure-JS deps in server-component graphs.
- Vercel CLI token on this machine is expired ("Not authorized" / team access) — no `vercel logs` until re-authed.
- eas submit needs no interactive login (EAS-hosted ASC API key `C2K5C8QVP7`); free-tier "waiting for an available submitter" can queue 15+ min — it completes server-side, safe to disconnect.
- git-credential-manager pops a modal "The string binding is invalid" crash dialog during agent-driven git pushes (GCM UI helper RPC failure; creds still work, pushes succeed). Modal = overnight-protocol hazard. Suggested to user: `git config --global credential.interactive false` (+ update Git for Windows).

## Recommendations

### Should be added to AGENTS.md (hot rules)
- Nothing new — the SafeHtml file comment + this session file carry it; consider promoting "never jsdom in server components; SafeHtml = sanitize-html" only if sanitization gets touched again.

### Should be added to knowledge/ (reference)
- `anti-patterns/known-pitfalls.md`: ESM-only transitive dep crash class + probe-route debugging recipe + git add atomic pathspec abort.

## Supersedes
- SYSTEM.md "XSS protection | DOMPurify | Client components only" row (edited to sanitize-html; uncommitted — rides with the pending store-links batch).
- CHECKPOINT 0.4 note about isomorphic-dompurify (historical, leave).
