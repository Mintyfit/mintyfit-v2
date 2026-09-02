'use client'

import { useState, useRef, useCallback } from 'react'

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
 */
export function useVoiceInput({ language = 'en-US', onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const supportsWebSpeech =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const startWithWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = language

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (e) => {
      setIsListening(false)
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError('Speech recognition failed. Try typing instead.')
      }
    }
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscript?.(transcript)
    }

    recognition.start()
    return recognition
  }, [language, onTranscript])

  const startWithRecorder = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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
    recorder.onstart = () => setIsListening(true)
    recorder.onstop = async () => {
      setIsListening(false)
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
  }, [language, onTranscript])

  const startListening = useCallback(async () => {
    setError(null)
    setUpgradeRequired(false)
    if (supportsWebSpeech) {
      startWithWebSpeech()
      return
    }
    try {
      await startWithRecorder()
    } catch {
      setError('Microphone not available. Check permissions and try again.')
    }
  }, [supportsWebSpeech, startWithWebSpeech, startWithRecorder])

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsListening(false)
  }, [])

  return {
    isListening,
    isProcessing,
    error,
    upgradeRequired,
    startListening,
    stopListening,
    clearError: () => setError(null),
  }
}
