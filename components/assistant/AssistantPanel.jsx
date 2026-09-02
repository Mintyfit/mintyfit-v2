'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mic, Send, X, Lock, Sparkles } from 'lucide-react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/contexts/AuthContext'
import { canUseVoiceAssistant } from '@/lib/usageLimits'
import { generateRecipe } from '@/lib/recipe/recipeGenerator'
import { createClient } from '@/lib/supabase/client'
import { bustPlanWeekCache, JOURNAL_SAVED_EVENT } from '@/lib/planner/planCache'

let msgId = 0
const nextId = () => ++msgId

/**
 * AssistantPanel — conversational interface ("Minty Chat").
 *
 * Supports: recipe search (catalogue cards), recipe creation (inline
 * generation), food journal logging (confirm card), nutrition questions.
 * Paid feature: gated by canUseVoiceAssistant(tier) — free users see an
 * upgrade teaser.
 *
 * Props:
 *   members   — optional family members for journal logging (planner context)
 *   onClose   — optional, renders a close button (sheet/modal usage)
 *   autoFocus — focus the input on mount
 */
export default function AssistantPanel({ members = [], onClose, autoFocus = false }) {
  const router = useRouter()
  const { user } = useAuth()
  const { tier } = useSubscription()
  const entitled = canUseVoiceAssistant(tier)

  const [messages, setMessages] = useState([
    { id: nextId(), role: 'assistant', text: 'Hi! Tell me what you\'d like — e.g. "a chicken salad for lunch", or "log: I had two eggs and toast".' },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  const push = useCallback((msg) => {
    setMessages(prev => [...prev, { id: nextId(), ...msg }])
  }, [])

  const patch = useCallback((id, updates) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)))
  }, [])

  const handleTranscript = useCallback((text) => {
    if (!text?.trim()) return
    setInput('')
    // Voice is conversational — send automatically after a beat
    setTimeout(() => sendRef.current?.(text.trim()), 350)
  }, [])

  const voice = useVoiceInput({ onTranscript: handleTranscript })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // ── Recipe generation inside the chat ────────────────────────────────────
  async function runGeneration(prompt, cardId) {
    try {
      const recipe = await generateRecipe(prompt, user?.id, (step, label) => {
        patch(cardId, { progressLabel: label })
      }, {})
      patch(cardId, { creating: false, recipe })
    } catch (err) {
      const limit = err.message?.startsWith('LIMIT_REACHED')
      patch(cardId, {
        creating: false,
        failed: limit
          ? 'Daily recipe limit reached — upgrade for unlimited.'
          : 'Generation failed. Try again?',
      })
    }
  }

  // ── Journal save ─────────────────────────────────────────────────────────
  async function saveJournalEntry(log, cardId, mealType, memberId) {
    const supabase = createClient()
    if (!supabase || !user?.id) return
    patch(cardId, { saving: true })
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('food_journal').insert({
      profile_id: user.id,
      logged_date: today,
      meal_type: mealType || log.meal_type || 'snack',
      food_name: log.food_name,
      amount: log.amount,
      unit: log.unit,
      nutrition: log.nutrition,
      member_id: memberId || user.id,
    })
    if (error) {
      patch(cardId, { saving: false, saveError: 'Could not save — try the journal form.' })
    } else {
      patch(cardId, { saving: false, saved: true })
      push({ role: 'assistant', text: `Logged "${log.food_name}" to today's journal. ✅` })
      // The planner caches its week in localStorage (30-min TTL) — bust it and
      // notify a mounted planner so the entry actually shows up on /plan.
      bustPlanWeekCache(user.id)
      window.dispatchEvent(new CustomEvent(JOURNAL_SAVED_EVENT, { detail: { dateKey: today } }))
    }
  }

  // ── Send ─────────────────────────────────────────────────────────────────
  async function send(text) {
    const trimmed = (text || '').trim()
    if (!trimmed || busy) return
    setBusy(true)
    push({ role: 'user', text: trimmed })

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.text || '' }))
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })
      const data = await res.json()

      if (res.status === 403 && data.error === 'UPGRADE_REQUIRED') {
        push({ role: 'assistant', upgrade: true })
        return
      }
      if (!res.ok) throw new Error(data.error || 'Assistant error')

      if (data.intent === 'find_recipe') {
        push({
          role: 'assistant',
          text: data.message,
          recipes: data.recipes || [],
          offerCreate: data.offerCreate,
          createPrompt: data.createPrompt,
        })
      } else if (data.intent === 'create_recipe') {
        const cardId = nextId()
        setMessages(prev => [...prev, {
          id: cardId, role: 'assistant', text: data.message,
          creating: true, progressLabel: 'Starting…',
        }])
        runGeneration(data.recipe_prompt, cardId)
      } else if (data.intent === 'log_food') {
        push({ role: 'assistant', text: data.message, log: data.log })
      } else {
        push({ role: 'assistant', text: data.message || '…' })
      }
    } catch {
      push({ role: 'assistant', text: 'Sorry — something went wrong. Please try again.' })
    } finally {
      setBusy(false)
    }
  }
  const sendRef = useRef(send)
  sendRef.current = send

  // ── Paywall teaser for free tier ─────────────────────────────────────────
  if (!entitled) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '14px', padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} color="var(--primary)" />
          <strong style={{ color: 'var(--text-1)', fontSize: 'var(--text-base)' }}>Minty Chat</strong>
          <Lock size={14} color="var(--text-3)" />
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: '0 0 0.75rem' }}>
          Just say what you want — <em>"a chicken salad for lunch"</em> — and Minty finds it in the catalogue or creates it for you. Voice included.
        </p>
        <Link href="/pricing" style={{
          display: 'inline-block', background: 'var(--primary)', color: '#fff',
          padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none',
          fontSize: 'var(--text-sm)', fontWeight: 600,
        }}>
          Unlock with Pro →
        </Link>
      </div>
    )
  }

  // ── Chat UI ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
      height: '100%', maxHeight: '70vh',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)',
      }}>
        <Sparkles size={16} color="var(--primary)" />
        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)', flex: 1 }}>Minty Chat</strong>
        {onClose && (
          <button onClick={onClose} aria-label="Close chat" style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', minHeight: 180 }}>
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            {m.text && (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: m.role === 'user' ? 'var(--primary)' : 'var(--bg-subtle)',
                color: m.role === 'user' ? '#fff' : 'var(--text-1)',
                fontSize: 'var(--text-sm)', lineHeight: 1.5,
              }}>
                {m.text}
              </div>
            )}

            {/* Upgrade card */}
            {m.upgrade && (
              <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '12px', fontSize: 'var(--text-sm)' }}>
                <div style={{ color: 'var(--text-1)', marginBottom: '0.375rem' }}>Minty Chat is a Pro and Family feature.</div>
                <Link href="/pricing" style={{ color: 'var(--primary)', fontWeight: 700 }}>See plans →</Link>
              </div>
            )}

            {/* Recipe cards */}
            {m.recipes?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.375rem' }}>
                {m.recipes.map(r => (
                  <div key={r.id} style={{
                    display: 'flex', gap: '0.625rem', alignItems: 'center',
                    background: 'var(--bg-page)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '0.5rem',
                  }}>
                    {r.image ? (
                      <img src={r.image} alt="" width={44} height={44} loading="lazy"
                        style={{ borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '8px', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🍽️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                        {r.kcal ? `${r.kcal} kcal` : ''}{r.minutes ? ` · ${r.minutes} min` : ''}{r.reason ? ` · ${r.reason}` : ''}
                      </div>
                    </div>
                    <Link href={`/recipes/${r.slug || r.id}`} style={{
                      flexShrink: 0, fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--primary)',
                      textDecoration: 'none', padding: '0.375rem 0.625rem', border: '1px solid var(--primary)', borderRadius: '8px',
                    }}>
                      View
                    </Link>
                  </div>
                ))}
                {m.offerCreate && m.createPrompt && (
                  <button
                    onClick={() => { send(`create: ${m.createPrompt}`) }}
                    style={{
                      marginTop: '0.25rem', padding: '0.5rem 0.75rem', borderRadius: '10px',
                      border: '1px dashed var(--primary)', background: 'transparent',
                      color: 'var(--primary)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
                    }}
                  >
                    ✨ None of these — create a new one
                  </button>
                )}
              </div>
            )}

            {/* Inline recipe generation */}
            {m.creating && (
              <div style={{ marginTop: '0.375rem', padding: '0.75rem', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
                ⏳ {m.progressLabel || 'Working…'}
              </div>
            )}
            {m.recipe && (
              <div style={{ marginTop: '0.375rem', padding: '0.75rem', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-1)' }}>{m.recipe.title}</div>
                <button
                  onClick={() => router.push(`/recipes/${m.recipe.slug || m.recipe.id}`)}
                  style={{
                    marginTop: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: '8px', border: 'none',
                    background: 'var(--primary)', color: '#fff', fontWeight: 600,
                    fontSize: 'var(--text-sm)', cursor: 'pointer',
                  }}
                >
                  Open recipe →
                </button>
              </div>
            )}
            {m.failed && (
              <div style={{ marginTop: '0.375rem', fontSize: 'var(--text-sm)', color: '#dc2626' }}>{m.failed}</div>
            )}

            {/* Journal confirm card */}
            {m.log && !m.saved && (
              <div style={{ marginTop: '0.375rem', padding: '0.75rem', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-1)' }}>
                  {m.log.food_name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 2 }}>
                  {m.log.amount ? `${m.log.amount} ${m.log.unit} · ` : ''}
                  {Math.round(m.log.nutrition?.energy_kcal || 0)} kcal
                  {m.log.nutrition?.protein ? ` · ${Math.round(m.log.nutrition.protein)}g protein` : ''}
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    defaultValue={m.log.meal_type || 'snack'}
                    onChange={e => patch(m.id, { log: { ...m.log, meal_type: e.target.value } })}
                    aria-label="Meal type"
                    style={{ padding: '0.375rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 'var(--text-xs)' }}
                  >
                    {['breakfast', 'snack', 'lunch', 'snack2', 'dinner'].map(mt => (
                      <option key={mt} value={mt}>{mt === 'snack2' ? 'snack 2' : mt}</option>
                    ))}
                  </select>
                  {members.length > 1 && (
                    <select
                      defaultValue={user?.id}
                      onChange={e => patch(m.id, { logMember: e.target.value })}
                      aria-label="Family member"
                      style={{ padding: '0.375rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 'var(--text-xs)' }}
                    >
                      {members.map(mb => (
                        <option key={mb.id} value={mb.id}>{mb.display_name || mb.first_name || mb.name}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => saveJournalEntry(m.log, m.id, m.log.meal_type, m.logMember)}
                    disabled={m.saving}
                    style={{
                      padding: '0.375rem 0.875rem', borderRadius: '8px', border: 'none',
                      background: 'var(--primary)', color: '#fff', fontWeight: 600,
                      fontSize: 'var(--text-xs)', cursor: 'pointer', opacity: m.saving ? 0.7 : 1,
                    }}
                  >
                    {m.saving ? 'Saving…' : 'Log it'}
                  </button>
                </div>
                {m.saveError && <div style={{ fontSize: 'var(--text-xs)', color: '#dc2626', marginTop: '0.375rem' }}>{m.saveError}</div>}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div style={{ alignSelf: 'flex-start', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: '12px 12px 12px 4px', fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>
            …
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '0.375rem', padding: '0.625rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={voice.isListening ? voice.stopListening : voice.startListening}
          disabled={voice.isProcessing}
          aria-label={voice.isListening ? 'Stop listening' : 'Voice input'}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${voice.isListening ? 'var(--primary)' : 'var(--border)'}`,
            background: voice.isListening ? 'rgba(61,138,62,0.12)' : 'var(--bg-card)',
            color: voice.isListening ? 'var(--primary)' : 'var(--text-3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Mic size={18} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { send(input); setInput('') } }}
          placeholder={voice.isListening ? 'Listening…' : voice.isProcessing ? 'Transcribing…' : 'Ask for a meal, or log food…'}
          aria-label="Message Minty Chat"
          style={{
            flex: 1, padding: '0.625rem 0.875rem', borderRadius: '22px',
            border: '1px solid var(--border)', background: 'var(--bg-page)',
            color: 'var(--text-1)', fontSize: 'var(--text-base)', outline: 'none',
          }}
        />
        <button
          onClick={() => { send(input); setInput('') }}
          disabled={!input.trim() || busy}
          aria-label="Send message"
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none',
            background: input.trim() && !busy ? 'var(--primary)' : 'var(--border)',
            color: input.trim() && !busy ? '#fff' : 'var(--text-4)',
            cursor: input.trim() && !busy ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Send size={18} />
        </button>
      </div>
      {(voice.error || voice.upgradeRequired) && (
        <div style={{ padding: '0 0.875rem 0.625rem', fontSize: 'var(--text-xs)', color: '#dc2626' }}>
          {voice.upgradeRequired
            ? <>Voice input needs Pro or Family — <Link href="/pricing" style={{ color: 'var(--primary)', fontWeight: 600 }}>upgrade</Link></>
            : voice.error}
        </div>
      )}
    </div>
  )
}

/**
 * AssistantFab — floating action button that opens AssistantPanel as a
 * bottom sheet (planner and other app pages).
 */
export function AssistantFab({ members = [] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Minty Chat"
        style={{
          position: 'fixed', right: '1rem', bottom: '5.5rem', zIndex: 60,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: 'var(--primary)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}
      >
        <Sparkles size={22} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Minty Chat"
          style={{
            position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{ width: '100%', maxWidth: 560, padding: '0.75rem' }}>
            <AssistantPanel members={members} onClose={() => setOpen(false)} autoFocus />
          </div>
        </div>
      )}
    </>
  )
}
