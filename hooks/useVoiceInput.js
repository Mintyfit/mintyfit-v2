'use client'

import { useState, useRef, useCallback } from 'react'

// If the getUserMedia promise neither resolves nor rejects within this window,
// the WebView/browser is swallowing the permission request (observed on stale
// app shells) — surface an error instead of hanging silently.
const MIC_START_TIMEOUT_MS = 12000
// MediaRecorder is started WITH a timeslice so `dataavailable` keeps firing
// during the recording. Without it, Android WebView builds can deliver an
// EMPTY file on stop() (no dataavailable ever fires) — which used to be
// swallowed by the "too short" early return: the user pressed Stop and got
// nothing at all.
const CHUNK_TIMESLICE_MS = 250
// If recorder.onstart never fires after start(), the recorder is wedged
// (WebView audio device left in a bad state) — tear down and say so instead
// of leaving the UI stuck on "Starting microphone…" with a dead mic button.
const RECORDER_START_TIMEOUT_MS = 4000
// The MediaRecorder path has no silence detection, so without a cap a
// forgotten recording would run (and stream chunks) indefinitely.
const MAX_RECORD_MS = 30000

/**
 * useVoiceInput — voice → text, everywhere.
 *
 * Strategy:
 *  1. Web Speech API (free, on-device) when the browser supports it
 *  2. MediaRecorder → POST /api/transcribe (Groq Whisper) — the path that
 *     works inside the Android WebView and other non-Chrome environments
 *
 * The /api/transcribe path is entitlement-gated server-side (pro/family).
 * The hook surfaces `upgradeRequired: true` when the server says so, so the
 * UI can render an upgrade prompt instead of an error.
 *
 * State machine: idle → isStarting (mic/permission wait) → isListening →
 * isProcessing (Whisper only) → idle. `error` is set on ANY failure — no
 * silent no-ops: an empty recording and an empty transcript both tell the
 * user what happened.
 */
export function useVoiceInput({ language = 'en-US', onTranscript } = {}) {
  const [isStarting, setIsStarting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const mediaRecorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const autoStopRef = useRef(null)
  const startWatchdogRef = useRef(null)

  const supportsWebSpeech =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current)
      autoStopRef.current = null
    }
  }, [])

  const clearStartWatchdog = useCallback(() => {
    if (startWatchdogRef.current) {
      clearTimeout(startWatchdogRef.current)
      startWatchdogRef.current = null
    }
  }, [])

  const startWithWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = language
    recognitionRef.current = recognition

    recognition.onstart = () => { setIsStarting(false); setIsListening(true) }
    recognition.onend = () => {
      recognitionRef.current = null
      setIsStarting(false)
      setIsListening(false)
    }
    recognition.onerror = (e) => {
      recognitionRef.current = null
      setIsStarting(false)
      setIsListening(false)
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError('Speech recognition failed. Try typing instead.')
      }
    }
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscript?.(transcript)
    }

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setIsStarting(false)
      setError('Speech recognition failed. Try typing instead.')
    }
  }, [language, onTranscript])

  const startWithRecorder = useCallback(async () => {
    // Defensive release: a previous session whose onstop never fired (seen in
    // the Android WebView) keeps the mic device locked, and the next
    // getUserMedia then hangs until the timeout — "mic works once, then never".
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null

    // Race getUserMedia against a timeout — inside a WebView whose shell
    // never answers the PermissionRequest the promise hangs FOREVER (no
    // reject), which is why the mic button used to appear dead.
    let timeoutId
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('mic-timeout')), MIC_START_TIMEOUT_MS)
      }),
    ]).finally(() => clearTimeout(timeoutId))
    streamRef.current = stream

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder
    chunksRef.current = []
    // Terminal-state guard: onerror and the start watchdog both stop the
    // recorder, which still fires onstop — that onstop must NOT run the
    // transcribe flow or overwrite the real error message.
    let failed = false

    const teardown = () => {
      clearAutoStop()
      clearStartWatchdog()
      stream.getTracks().forEach(t => t.stop())
      if (streamRef.current === stream) streamRef.current = null
      if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null
    }

    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data)
    }
    recorder.onstart = () => {
      clearStartWatchdog()
      setIsStarting(false)
      setIsListening(true)
    }
    recorder.onerror = () => {
      failed = true
      teardown()
      setIsStarting(false)
      setIsListening(false)
      setIsProcessing(false)
      setError('Recording failed — please try again.')
    }
    recorder.onstop = async () => {
      setIsListening(false)
      teardown()
      if (failed) return // onerror/watchdog already handled + messaged
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      chunksRef.current = []
      if (blob.size < 1000) {
        // Empty file on stop is a known WebView MediaRecorder failure mode —
        // never swallow it silently (this used to look exactly like
        // "press Stop and nothing happens").
        setError('Nothing was captured. Tap the mic and speak right away.')
        return
      }

      setIsProcessing(true)
      setError(null)
      try {
        const formData = new FormData()
        formData.append('audio', blob, `audio.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`)
        if (language) formData.append('language', language.split('-')[0])

        const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.status === 403 && data.error === 'UPGRADE_REQUIRED') {
          setUpgradeRequired(true)
          return
        }
        if (!res.ok) throw new Error(data.error || 'Transcription failed')
        if (data.text) onTranscript?.(data.text)
        else setError('Could not understand that — please try again.')
      } catch (err) {
        setError('Could not transcribe. Try again or type instead.')
      } finally {
        setIsProcessing(false)
      }
    }

    recorder.start(CHUNK_TIMESLICE_MS)
    // Watchdog: onstart should fire immediately. If it doesn't, the recorder
    // is wedged — tear down instead of a stuck "Starting microphone…" state.
    clearStartWatchdog()
    startWatchdogRef.current = setTimeout(() => {
      failed = true
      try { if (recorder.state !== 'inactive') recorder.stop() } catch {}
      teardown()
      setIsStarting(false)
      setIsListening(false)
      setError('Microphone did not start. Please try again.')
    }, RECORDER_START_TIMEOUT_MS)
    // Safety net: auto-stop long recordings (the recorder never stops itself).
    clearAutoStop()
    autoStopRef.current = setTimeout(() => {
      try { if (recorder.state !== 'inactive') recorder.stop() } catch {}
    }, MAX_RECORD_MS)
  }, [language, onTranscript, clearAutoStop, clearStartWatchdog])

  const startListening = useCallback(async () => {
    setError(null)
    setUpgradeRequired(false)
    setIsStarting(true)
    if (supportsWebSpeech) {
      startWithWebSpeech()
      return
    }
    try {
      await startWithRecorder()
    } catch (err) {
      setIsStarting(false)
      setIsListening(false)
      setError(
        err?.message === 'mic-timeout'
          ? 'Microphone did not respond. Check mic permission — on the app, update to the latest version.'
          : 'Microphone not available. Check permissions and try again.'
      )
    }
  }, [supportsWebSpeech, startWithWebSpeech, startWithRecorder])

  const stopListening = useCallback(() => {
    clearAutoStop()
    // Web Speech path: stop() finalizes and still delivers the result.
    try { recognitionRef.current?.stop() } catch {}
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop() } catch {}
    }
    setIsStarting(false)
    setIsListening(false)
  }, [clearAutoStop])

  return {
    isStarting,
    isListening,
    isProcessing,
    error,
    upgradeRequired,
    startListening,
    stopListening,
    clearError: () => setError(null),
  }
}
