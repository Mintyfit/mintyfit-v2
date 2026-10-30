# Session — iOS build 7 launch crash (WebKit main-thread init trap) — 2026-10-19

## What happened

First-ever TestFlight build (v1.0.0 build 7, commit `16cb0cd`, EAS build `0effa642`) installed fine but **crashed on every launch**. Diagnosed end-to-end without a Mac.

## Root cause

`FreshnessModule.nukeStaleWebStateAfterUpgrade` (Swift Expo module) called `WKWebsiteDataStore.default()` directly inside a sync `Function`. Expo executes sync module functions on the **JS thread** (`com.facebook.react.runtime.JavaScript`). That call was the process's first WebKit touch, so it triggered one-time `WebKit::InitializeWebKit2()` on the JS thread — WebKit hard-requires main-thread init → **SIGTRAP / EXC_BREAKPOINT** ("pointer authentication trap IB") in `WebKit::runInitializationCode`, 100% reproducible.

Both device `.ips` logs showed the identical faulting stack: Hermes interpreter → `createHostFunction` → `SyncFunctionDefinition` → `+[WKWebsiteDataStore defaultDataStore]` → `WebKit::InitializeWebKit2` → trap. Meanwhile the main thread was mid-RNCWebView creation — our freshness call simply won the race to WebKit.

**Fix:** wrap the body in `DispatchQueue.main.async` in `modules/freshness/ios/FreshnessModule.swift`. Fire-and-forget (JS side returns void, try/catch kept). General rule, now Hard Rule 2 in the iOS repo AGENTS.md: **any native module touching WebKit APIs must dispatch to the main thread.**

## Diagnosis recipe (no Mac, reusable)

1. Device `.ips`: Settings → Privacy & Security → Analytics & Improvements → Analytics Data → `MintyFit-*.ips` (needs "Share iPhone Analytics" ON before the crash; else re-trigger). TestFlight "Share" also lands in ASC → TestFlight → Crashes.
2. Read the **`triggered: true` thread** — the symbolicated system frames (`+[WKWebsiteDataStore defaultDataStore]`) plus `ExpoModulesCore SyncFunctionDefinition` frames were enough to name the culprit without app symbols.
3. Static IPA audit (rules out config before blaming runtime): `eas build:list` → artifact URL → download IPA (public signed URL) → rename .zip → Expand-Archive. Verified in the bundle: GoogleService-Info.plist real+ bundled, RNFB/RNCWebView/Freshness symbols linked (Select-String on the binary), provisioning has aps-environment=production + applesignin, main.jsbundle Hermes magic + app strings present.
4. `npx eas-cli build:view <id> --json` gives signed GCS log URLs (900s TTL); log files are **Brotli** — decompress via Node `zlib.brotliDecompressSync` (not gzip; magic `8B FF`… ≠ `1F 8B`). expo-doctor findings in the build log were noise (duplicate app.json array items, patch-version drift).

## Secondary fixes in the same pass

- app.json: removed duplicate `applinks:mintyfit.com` and duplicate `remote-notification` UIBackgroundMode (expo-doctor schema errors).

## TestFlight tester note (separate from the crash)

Apple Account `liisumumm@hotmail.com` had already redeemed the invite sent to `ronald@outline.ee` → second invite to liisumumm can't be accepted ("already associated"). Cosmetic: the account IS a tester via the ronald@ invite; app installs/updates fine. Clean swap if ever wanted: TestFlight app → MintyFit → Stop Testing, then accept the liisumumm invite (or remove the tester in ASC).

## Files modified

- iOS repo: `modules/freshness/ios/FreshnessModule.swift` (main-thread dispatch fix), `app.json` (dupes), `AGENTS.md` (Hard Rule 2 main-thread requirement + Current State + .ips debugging pointer)
