# Session: Mobile drawer sign-out fix + app staleness root cause & self-heal deploy
**Date**: 2026-09-10
**Duration**: ~30min
**Task**: (1) Sign Out hidden behind bottom nav in mobile menu. (2) Installed Android app showing old "Generate recipe" window instead of Minty Chat while recipes stayed fresh — make the app reliably track latest deploys.

## What Was Done
- `components/Navbar.jsx`: mobile menu drawer `bottom: 0` → `bottom: 'calc(64px + env(safe-area-inset-bottom))'` so the drawer ends above the fixed bottom nav (same value as the body padding rule). Drawer was `bottom:0` + z-199; bottom nav z-200 painted over the drawer's tail. Committed + pushed as `183a053`, verified live via `/api/version`.
- Diagnosed app staleness: app's WebView serves a pre-Minty-Chat HTML/JS bundle from its own HTTP cache. Recipe data stays fresh because it's live Supabase fetches; chat UI is baked into the stale JS bundle.
- Found the self-heal (DeploymentCheck + `/api/version`, commit `d1e0545`) was **committed locally but never pushed** — production returned 404 for `/api/version`, no `__MINTY_BUILD__` in HTML. Pushed it; verified live.
- **User then reported Clear Storage + reinstall didn't help.** Built and shipped app v1.2 (versionCode 3) to Play PRODUCTION via `upload_to_play.py` (TRACK switched internal→production, status draft→completed):
  - `AndroidManifest.xml`: `allowBackup="false"` (dropped `fullBackupContent`)
  - `data_extraction_rules.xml`: excludes ALL domains for cloud-backup AND device-transfer
  - `MainActivity.kt`: `nukeStaleWebStateAfterUpgrade()` — one-time per versionCode (SharedPreferences-stamped) `WebStorage.deleteAllData()` + `CookieManager.removeAllCookies` + `WebView.clearCache(true)` in onCreate before any load, so updates unstick every existing install with zero user steps
  - `build.gradle.kts`: versionCode 3 / "1.2", `buildConfig = true` (AGP 8 default is off)
- Build env gotchas: system `java` on PATH hangs — use Android Studio JBR (`C:\Program Files\Android\Android Studio\jbr`) as JAVA_HOME; Kotlin daemon crashed on OOM (Windows commit exhaustion again, cf. 2026-09-03) — fix: `gradlew --stop`, kill stale java, `--no-daemon -Dkotlin.compiler.execution.strategy=in-process`.

## Findings

### What Worked
- Symptom split as diagnostic: **data fresh but UI stale = stale JS bundle, not stale data/API**. Points straight at shell/HTML cache, not Supabase.
- Verifying production directly (`/api/version`, grep served HTML for `__MINTY_BUILD__`) instead of assuming the last session's code was deployed — it wasn't.

### Bugs Found
- Mobile drawer bottom hidden under bottom nav (z-index 199 vs 200 + `bottom:0`). Fixed.
- **Self-heal gap**: the stale-build fix sat unpushed for a day; and even deployed, pre-DeploymentCheck builds can't self-heal — the stale code lacks the check. One manual cache clear (Settings → Apps → MintyFit → Storage → Clear Cache) or reinstall is mandatory per affected device.

### New Knowledge
- A freshness self-heal mechanism only protects builds that CONTAIN it. After shipping such a mechanism: (1) deploy immediately, (2) verify the endpoint live, (3) one-time manual clear/reinstall for devices stuck on older builds.
- Android WebView `LOAD_DEFAULT` cache can serve stale HTML across app restarts even with correct server `must-revalidate` headers.
- **ROOT CAUSE of "reinstall didn't help" (confirmed after user cleared cache + reinstalled with no change): `android:allowBackup="true"` + empty backup rules = Android Auto Backup archived the whole WebView profile (HTTP cache, SW registrations, Cache Storage, localStorage) and Play RESTORED it onto the reinstalled app.** Clear Cache ≠ Clear Storage: SW registrations / Cache Storage / localStorage live in app data, not cache. Fixed in `D:\WORKS\Minty\Android`: manifest `allowBackup="false"` (dropped `fullBackupContent`), `data_extraction_rules.xml` excludes ALL domains for cloud-backup AND device-transfer (D2D honors extraction rules even with allowBackup=false). Verified shipped AAB (Sept 4) and debug APK (June) both point to `https://mintyfit.com` — URL was never the problem. Production verified serving current build (SSR HTML of /recipes contains "Minty Chat").
- Diagnostic rule: verify the SERVER first (`/api/version`, SSR HTML markers, shipped binary strings), then the client state layers in order of survivability: HTTP cache < SW/Cache Storage (survives Clear Cache) < Auto Backup restore (survives reinstall).

## Recommendations

### Should be added to AGENTS.md (hot rules)
- None new — the existing "No Service Worker Cache" rule + 2026-09-09 DeploymentCheck notes cover it. (If staleness recurs, revisit `LOAD_NO_CACHE` in the shell.)

### Should be added to knowledge/ (reference)
- This file only.

## Follow-ups (user action)
- Clear the app cache once on the affected phone (or reinstall) to get onto a self-healing build.
- Navbar drawer fix still uncommitted — commit when convenient.

## Supersedes
- None.
