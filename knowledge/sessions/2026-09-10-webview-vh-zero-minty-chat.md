# Session — Minty Chat invisible in Android app (WebView `vh` units = 0)

**Date**: 2026-09-10
**Repos**: `AprillBuild` (web — no changes needed) + `D:\WORKS\Minty\Android` (fix landed here)

## Symptom

In the installed Android app, logged-in entitled users (pro/family/nutritionist) saw NO Minty Chat panel on /recipes (just a thin gray line) and an empty dimmed overlay from the /plan FAB. Logged-out users saw the teaser fine. Browsers (desktop + Android Chrome) worked fine for the same account. User (correctly) reported "not working when logged in"; suspected caching — disproven.

## Root cause

The app shell's Compose `AndroidView` created the WebView **without explicit LayoutParams**. On the Chromium 134 WebView this leaves the CSS Initial Containing Block height permanently at 0 → **all `vh` units compute to `0px`** for the lifetime of the WebView instance (`window.innerHeight` is still correct; reloads and resizes do NOT recover).

`AssistantPanel`'s entitled chat UI is the only render path with `maxHeight: '70vh'` (+ `height: '100%'` + `overflow: hidden`) → root clamps to ~2px, content clipped → invisible panel. The teaser/placeholder paths have no `vh` → unaffected. Same mechanism silently breaks every `80vh/85vh` bottom sheet in the app (JournalEntryForm, RecipePickerModal, ActivityForm, SwapPopup, RecipeNutrition modal).

## Fix (Android repo, MainActivity.kt)

```kotlin
factory = { context ->
    WebView(context).apply {
        layoutParams = ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        ...
```

Verified: `100vh` div 0px → 914px; Minty Chat panel renders (260px), works for ronald + a fresh family-tier test user.

**Requires a new release** (`build-release.bat`, bump versionCode 3→4 / 1.2→1.3) — v1.2 installs stay broken until they update.

## How it was diagnosed (reusable)

- Debug builds now have `WebView.setWebContentsDebuggingEnabled(true)` (DEBUG-guarded) → CDP via `adb forward tcp:9223 localabstract:webview_devtools_remote_<pid>` + puppeteer-core. Socket name from `adb shell cat /proc/net/unix | grep webview_devtools`.
- Headless login for any browser/WebView without the UI: Supabase admin `generate_link` → `fetch(action_link, {redirect:'manual'})` → fragment has tokens → base64url `{at,rt,ts}` → `https://mintyfit.com/auth/handle-session?t=...` as an `am start` deep link (sets cookies server-side; no reliance on hash detection, which did NOT stick in headless desktop Chrome).
- `uiautomator dump` does NOT expose WebView content; `screencap` + image crop (System.Drawing) works.
- Emulator Chrome shares the WebView's Chromium build (both 134.0.6998.135 here) — good for engine-vs-shell A/B tests (`chrome_devtools_remote` socket).

## Key learning

"Works in browser, invisible in app, account-dependent-looking" can be a **rendering-environment** bug, not data/auth/cache. The entitled-only visibility pattern pointed at the one render path with `vh`. Measure the box, don't guess.
