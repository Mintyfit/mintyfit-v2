# Session — 2026-10-12 — Voice input fixed (WebView) + text-size slider

**Scope:** `hooks/useVoiceInput.js` (rewritten), `components/assistant/AssistantPanel.jsx`, `components/recipes/RecipeGeneratorClient.jsx`, `components/planner/JournalEntryForm.jsx`, `hooks/useVoice.js` (DELETED), `app/globals.css`, `app/layout.jsx`, `components/account/TextSizeSettings.jsx` (new), `components/account/MyAccountClient.jsx`, `SYSTEM.md`, `knowledge/conventions/styling.md`

## Problem 1: mic button dead in the mobile app

User report: Minty Chat mic on /recipes does nothing — no listening indication, no transcription. Three stacked causes:

1. **Legacy `useVoice` was broken everywhere, even desktop.** Both consumers (`RecipeGeneratorClient`, `JournalEntryForm`) pass `{ onTranscript }` to the hook, but `useVoice()` takes NO params — and their buttons called `startListening` with no callback, so `onresult` fired `undefined(transcript)`. Silent TypeError after every utterance.
2. **Web Speech API does not exist in Android WebView / WKWebView** → those consumers had no fallback at all.
3. **In Minty Chat (already on `useVoiceInput`), the MediaRecorder path has no silence auto-stop.** Recording only ends when the user taps the mic again — and the ONLY indication was a subtle button color change. Users speak, wait, nothing happens, transcription never fires. Also, `getUserMedia` can hang forever (never resolves/rejects) when a shell swallows the PermissionRequest — pure silence.

## Fix

- **`useVoiceInput` hardened**: `isStarting` state (immediate feedback while the mic/permission layer answers), 12s `getUserMedia` timeout with a targeted error ("check mic permission / update the app"), 30s auto-stop cap on MediaRecorder (no more endless recording), error paths reset all states.
- **`AssistantPanel`**: new `VoiceStatusBar` — pulsing red dot + animated waveform bars + "Listening… speak now" + red **Stop** button (keyframes `mf-rec-pulse` / `mf-voice-bar-anim` in globals.css, rem-sized). "Starting microphone…" / "Transcribing…" states. Transcript now lands IN THE INPUT FIELD (was: auto-send after 350ms) so the user sees and can fix it before sending — explicit user request. Mic disabled while starting/processing.
- **Ported `RecipeGeneratorClient` + `JournalEntryForm` to `useVoiceInput`** (fixes the ignored-callback bug AND adds the WebView fallback + status line to both). `hooks/useVoice.js` DELETED — zero consumers left, broken by design.
- Shell side needed NO change: Android v1.3 already has `onPermissionRequest` + RECORD_AUDIO; iOS has `NSMicrophoneUsageDescription`.

## Problem 2: text too small in the app → user-controllable text size

- `globals.css`: root sizes are now `calc(17px * var(--user-text-scale, 1))` (18px / 18.5px breakpoints scale too) — one CSS var scales ALL rem text + rem control tokens.
- `app/layout.jsx` boot script: applies `localStorage['minty-text-scale']` pre-paint (no flash).
- New `components/account/TextSizeSettings.jsx`: slider 85–140% (5% steps) in My Account → Preferences, live % label, Reset button. Device-local (it's an accessibility/device preference — no DB column).

## Verified

- `npm run build` ×2 clean (75/75 pages), including after the `useVoice.js` deletion.

## Gotchas for future sessions

- The MediaRecorder path NEVER stops by itself — any new voice UI must surface Stop prominently.
- If users still report a dead mic on the app AFTER this ships, suspect a stale shell bundle (pre-self-heal builds never update — see staleness incidents) — the new 12s timeout now turns that into a visible error instead of silence.
- `--user-text-scale` only multiplies rem; anything in raw px ignores it (another reason for the no-raw-px control rule).
