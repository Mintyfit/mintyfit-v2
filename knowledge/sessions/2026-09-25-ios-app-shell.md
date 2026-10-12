# Session — iOS App Shell (no-Mac build pipeline) — 2026-09-25

## What happened

Built the MintyFit iOS app as a thin WKWebView shell (parity with the Android shell at `D:\WORKS\Minty\Android`), developed entirely on Windows — no Mac. New repo: `D:\WORKS\Minty\iOS` (Expo SDK 57 + TypeScript + react-native-webview; builds run on EAS macOS cloud via `build-release.bat`).

## Decisions

- **Expo + EAS over hand-written Swift + Codemagic**: local typecheck/lint on Windows, EAS manages signing certs automatically (critical for a first-time iOS publisher with no Xcode), `eas submit` → TestFlight. Native Swift alternative would compile only in CI with slow error loops.
- **Bundle id `com.mintyfit.app`** — same string as the Android applicationId (separate namespaces; keeps identity consistent).
- **App Store compliance strategy:** hide purchase CTAs in the iOS shell (3.1.1), Sign in with Apple (4.8), account deletion (5.1.1 — already existed at `/api/gdpr/delete` + My Account UI; verified, no new work).

## Web-repo changes (AprillBuild)

- `app/api/well-known/apple-app-site-association/route.js` + rewrite in `next.config.mjs` — AASA for universal links. **Next.js App Router ignores dot-prefixed folders** (`app/.well-known/...` never routes) — that's why the route lives under `/api` with a rewrite. Returns 404 until `APPLE_TEAM_ID` env is set (never serve Apple a malformed AASA — their CDN caches it). Verified: 200 + `application/json` + correct appIDs with env set; 404 without.
- `lib/platform.js` — `getShellPlatform()` / `isIOSShell()` / `openExternal()`. Shell injects `window.__MINTY_PLATFORM__` + UA token `MintyFitApp-iOS`; `openExternal()` uses the `ReactNativeWebView` postMessage bridge (`{type:'openExternal', url}`).
- **Hydration gotcha:** platform flags must be read in `useEffect`, not during render — SSR HTML would mismatch the shell's client render.
- `PricingClient` + `MyAccountClient` — paid CTAs + billing portal call `openExternal()` on iOS; `/api/stripe/checkout` 403s the `MintyFitApp-iOS` UA (defense in depth).
- `AuthContext.signInWithApple()` + Apple button in `AuthModal` (black button per Apple HIG, placed above Google).
- Account deletion already existed — earlier grep missed it because it was case-sensitive ("Delete account" vs `delete.?account`). **Lesson: grep case-insensitively for UI text.**
- Docs: AGENTS.md (iOS section), SYSTEM.md (env, auth, routes, "App Shell Platform Contract").

## iOS repo structure

- `App.tsx` — mirrors MainActivity.onCreate: freshness nuke → push init → resolveStartUrl (universal link / notification tap) → one-time notification pre-prompt card.
- `src/WebViewScreen.tsx` — WKWebView, nav policy (mintyfit.com in-app, rest external), `onMessage` openExternal bridge, `mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"` (iOS 15+ mic for getUserMedia), error screen + retry.
- `src/notifications.ts` — **RNFirebase v26 is modular-only** (`getMessaging()`, `subscribeToTopic(messaging, …)` — no default export; the v21-style `messaging()` namespace API is gone from the types).
- `modules/freshness/` — local Expo module (Swift) wiping WKWebsiteDataStore **cache types only** once per buildNumber. Deliberately preserves cookies/localStorage (iOS has no Android-style backup-restore staleness vector; logging users out per update would be pointless). Needs `ios/Freshness.podspec` + `expo-module.config.json` to autolink.
- `eas.json` — production profile `autoIncrement: true`; submit profile empty (interactive Apple login on first submit).
- Local modules in `modules/` autolink at prebuild on EAS — **do not run `expo prebuild` locally on Windows** (Android repo's AGENTS.md has the same class of rule for Gradle).

## RN 0.86 / Expo SDK 57 gotchas

- `StyleSheet.absoluteFillObject` is gone from the types — use explicit `position:'absolute', top/left/right/bottom: 0`.
- `npx expo install <pkg>` picks SDK-compatible versions (template ships its own AGENTS.md saying this — read template AGENTS.md files, they carry real constraints).
- `@react-native-firebase` on iOS needs `expo-build-properties` with `ios.useFrameworks: 'static'`.
- Verified locally: `tsc --noEmit` ✓, `expo lint` ✓, `expo-doctor` 21/21 ✓, `expo config` resolves ✓. Native compile still unverified (first EAS build pending Apple enrollment).

## Known gaps / follow-ups

- `hooks/useVoice.js` (recipe generator + journal form) is Web-Speech-only — `webkitSpeechRecognition` does NOT exist in WKWebView → iOS shell users get the "not supported" toast there. `useVoiceInput.js` (Minty Chat) already falls back to MediaRecorder → `/api/transcribe`. Follow-up: port the fallback into `useVoice`.
- Icon is the 512px Play asset upscaled to 1024 — replace with a true 1024 render before submission.
- OAuth-in-shell relies on universal links firing from the Safari redirect (cross-domain redirects in Safari DO open the app). If AASA isn't cached yet, the session completes in Safari instead — acceptable fallback, no data loss.
- First EAS build is the real compile test for the Swift module + RNFirebase pods; failed builds count against the free tier (15/month).

## Files created/modified

- Web: `app/api/well-known/apple-app-site-association/route.js`, `next.config.mjs`, `lib/platform.js`, `components/pricing/PricingClient.jsx`, `components/account/MyAccountClient.jsx`, `contexts/AuthContext.jsx`, `components/landing/AuthModal.jsx`, `app/api/stripe/checkout/route.js`, `AGENTS.md`, `SYSTEM.md`
- iOS repo (new): full Expo scaffold at `D:\WORKS\Minty\iOS` — `App.tsx`, `src/{config,WebViewScreen,notifications}.ts(x)`, `modules/freshness/`, `app.json`, `eas.json`, `build-release.bat`, `AGENTS.md`, `GoogleService-Info.plist.example`
