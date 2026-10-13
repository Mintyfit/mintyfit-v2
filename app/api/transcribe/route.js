import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enforceUsageLimit, canUseVoiceAssistant } from '@/lib/usageLimits'

export const maxDuration = 30

// POST /api/transcribe — audio file → text via xAI Speech-to-Text
// (grok-voice-transcribe-2.0) — uses the same XAI_API_KEY as the rest of the
// Grok features (was Groq-hosted Whisper until 2026-10-13; xAI shipped STT).
// Paid feature (STT costs per minute): pro/family tiers only.
// Body: multipart/form-data with `audio` (webm/opus/m4a), optional `language`.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Entitlement gate: voice is a paid feature
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()
  const tier = profile?.subscription_tier || 'free'
  if (!canUseVoiceAssistant(tier)) {
    return NextResponse.json(
      { error: 'UPGRADE_REQUIRED', message: 'Voice input is a Pro and Family feature.' },
      { status: 403 }
    )
  }

  // Anti-abuse metering
  const usage = await enforceUsageLimit(supabase, user.id, 'transcribe')
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'LIMIT_REACHED', current: usage.current, limit: usage.limit },
      { status: 429 }
    )
  }

  const xaiKey = process.env.XAI_API_KEY
  if (!xaiKey) {
    return NextResponse.json({ error: 'Transcription not configured' }, { status: 500 })
  }

  let audioFile, language
  try {
    const formData = await request.formData()
    audioFile = formData.get('audio')
    language = formData.get('language') || undefined
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data with an audio file' }, { status: 400 })
  }

  if (!audioFile || typeof audioFile === 'string') {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }

  // Cap at ~10 MB (≈ 2+ min of webm/opus) — voice queries are seconds long
  if (audioFile.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio too long (max ~2 minutes)' }, { status: 413 })
  }

  try {
    const upstream = new FormData()
    upstream.append('file', audioFile, audioFile.name || 'audio.webm')
    upstream.append('model', 'grok-voice-transcribe-2.0')
    if (language) upstream.append('language', language)

    const response = await fetch('https://api.x.ai/v1/stt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${xaiKey}` },
      body: upstream,
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('xAI STT error:', response.status, err.slice(0, 300))
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json({ text: (data.text || '').trim() })
  } catch (error) {
    console.error('Transcribe proxy error:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
