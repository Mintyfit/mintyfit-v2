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

## Provider switch: Groq Whisper → xAI STT (same day)

`GROQ_API_KEY` was confirmed MISSING from Vercel production (listed all env vars via Vercel API — only `XAI_API_KEY` existed). Rather than add a third AI provider, `/api/transcribe` was switched to **xAI Speech-to-Text** — xAI shipped `POST https://api.x.ai/v1/stt` (`grok-voice-transcribe-2.0`, multipart `file`+`model`+`language`, response `{ text, language, duration, words }`, webm/mp4/m4a supported, ~$0.10/hr audio). Uses the `XAI_API_KEY` already in Vercel + local.

**Verified for real:** TTS (`/v1/tts`, voice eve) → STT round-trip with the production key: generated "I had two eggs and toast for breakfast", got back exactly that text, HTTP 200. Windows curl note confirmed again: JSON bodies must go via `--data-binary @file` + `--ssl-no-revoke`.

## Rules for future sessions

- **Never start a MediaRecorder without a timeslice** in code that targets WebViews — empty-file-on-stop is a known WebView failure mode.
- **Never early-return silently in media pipelines** — a mute `< 1000` byte check turned a one-line codec quirk into an undebuggable "nothing happens" report. Every failure path sets `error`.
- Symptom-reading trick: "no Transcribing state appeared" pinpointed the failure to BEFORE `setIsProcessing(true)` — i.e., client-side, not the server/Groq. State-machine ordering is a debugging tool.
- Provider-consolidation rule: before adding a NEW API key/provider for a capability, re-check what the EXISTING providers now offer — xAI had no STT when the pipeline was built (Sep 2026), but shipped it weeks later.

## Rules for future sessions

- **Never start a MediaRecorder without a timeslice** in code that targets WebViews — empty-file-on-stop is a known WebView failure mode.
- **Never early-return silently in media pipelines** — a mute `< 1000` byte check turned a one-line codec quirk into an undebuggable "nothing happens" report. Every failure path sets `error`.
- Symptom-reading trick: "no Transcribing state appeared" pinpointed the failure to BEFORE `setIsProcessing(true)` — i.e., client-side, not the server/Groq. State-machine ordering is a debugging tool.
