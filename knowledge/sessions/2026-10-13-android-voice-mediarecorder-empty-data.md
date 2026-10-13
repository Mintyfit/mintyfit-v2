# Session — 2026-10-13 — Android voice: MediaRecorder empty-data silent failure

**Scope:** `hooks/useVoiceInput.js` (rewritten), `SYSTEM.md` (hook description), knowledge files.

## Problem

User report (Android app, Minty Chat on /recipes): mic shows the listening waveform fine, but pressing **Stop → nothing happens** (no "Transcribing…", no text, no error). **Second mic tap → waveform never appears again.**

## Root cause

All three symptoms trace to `useVoiceInput.js` (MediaRecorder path — Android WebView has no `SpeechRecognition`):

1. **`recorder.start()` with no timeslice** — Android WebView builds can deliver an EMPTY file on `stop()`: `dataavailable` never fires, `chunksRef` stays empty.
2. **Silent `blob.size < 1000` early return** swallowed the empty recording with zero feedback — this fires BEFORE `setIsProcessing(true)`, which is exactly why no "Transcribing…" state ever appeared. (Empty Whisper transcript — `if (data.text)` — was a second silent no-op.)
3. **Mic device not released** if `onstop` never fired (WebView drops it in the wedged case) → the next `getUserMedia` hangs on the locked device → "works once, then never". Plus no `recorder.onerror` handler, so a wedged recorder left `isStarting` stuck → dead mic button.

Android shell verified NOT at fault: `MainActivity.handleWebPermissionRequest` checks OS-level `RECORD_AUDIO` and only then grants the WebView request.

## Fix (`hooks/useVoiceInput.js`)

- `recorder.start(250)` — timeslice, the canonical fix for WebView empty-recording bugs.
- 4s **onstart watchdog** — wedged recorder tears down with a visible error instead of a stuck "Starting microphone…".
- `recorder.onerror` handler — resets all states, releases the mic, visible error.
- **No silent failures left**: empty recording (<1 KB) → "Nothing was captured…"; empty Whisper transcript → "Could not understand that…".
- `streamRef` + defensive track release on every start; `teardown()` clears refs/timers; `failed` guard so `onerror`/watchdog-stopped `onstop` doesn't run the transcribe flow or overwrite the real error.
- Bonus: `stopListening` now also stops the **Web Speech** recognition (was never stopped — Stop button did nothing on desktop Chrome).

## Verified

- `npm run build` clean (75 pages). Hook API unchanged — all 3 consumers (AssistantPanel, RecipeGeneratorClient, JournalEntryForm) get the fix automatically. App pulls fresh site (no SW cache) → no Android rebuild needed.
- ⚠️ NOT device-verified yet: real recording on the Android app still needs one on-device pass.

## ⚠️ Open item: GROQ_API_KEY

`GROQ_API_KEY` is **absent from `.env.local`** and its Vercel presence is unverified (CHECKPOINT manual step 4 was still open). If it's missing in production, `/api/transcribe` returns 500 → user now sees "Could not transcribe…" (visible, pre-fix it would ALSO have been visible — so the empty-blob bug was the real culprit here). **Verify the Vercel env var when testing on device.**

## Rules for future sessions

- **Never start a MediaRecorder without a timeslice** in code that targets WebViews — empty-file-on-stop is a known WebView failure mode.
- **Never early-return silently in media pipelines** — a mute `< 1000` byte check turned a one-line codec quirk into an undebuggable "nothing happens" report. Every failure path sets `error`.
- Symptom-reading trick: "no Transcribing state appeared" pinpointed the failure to BEFORE `setIsProcessing(true)` — i.e., client-side, not the server/Groq. State-machine ordering is a debugging tool.
