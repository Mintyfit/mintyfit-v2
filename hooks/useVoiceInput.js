'use client'

import { useState, useRef, useCallback } from 'react'

// If the getUserMedia promise neither resolves nor rejects within this window,
// the WebView/browser is swallowing the permission request (observed on stale
// app shells) — surface an error instead of hanging silently.
const MIC_START_TIMEOUT_MS = 12000
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
 * isProcessing (Whisper only) → idle. `error` is set on any failure.
 */
export function useVoiceInput({ language = 'en-US', onTranscript } = {}) {
  const [isStarting, setIsStarting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const autoStopRef = useRef(null)

  const supportsWebSpeech =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current)
      autoStopRef.current = null
    }
  }, [])

  const startWithWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = language

    recognition.onstart = () => { setIsStarting(false); setIsListening(true) }
    recognition.onend = () => { setIsStarting(false); setIsListening(false) }
    recognition.onerror = (e) => {
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
      setIsStarting(false)
      setError('Speech recognition failed. Try typing instead.')
    }
    return recognition
  }, [language, onTranscript])

  const startWithRecorder = useCallback(async () => {
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

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data)
    }
    recorder.onstart = () => { setIsStarting(false); setIsListening(true) }
    recorder.onstop = async () => {
      setIsListening(false)
      clearAutoStop()
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      if (blob.size < 1000) return // too short — ignore

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
      } catch (err) {
        setError('Could not transcribe. Try again or type instead.')
      } finally {
        setIsProcessing(false)
      }
    }

    recorder.start()
    // Safety net: auto-stop long recordings (the recorder never stops itself).
    clearAutoStop()
    autoStopRef.current = setTimeout(() => {
      try { recorder.stop() } catch {}
    }, MAX_RECORD_MS)
  }, [language, onTranscript, clearAutoStop])

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
    try { mediaRecorderRef.current?.stop() } catch {}
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
