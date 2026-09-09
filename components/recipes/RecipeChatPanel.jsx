'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Send, X, Sparkles, Lock, Check, RotateCcw } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { canUseVoiceAssistant } from '@/lib/usageLimits'

let msgId = 0
const nextId = () => ++msgId

/**
 * RecipeChatPanel — conversational "adjust this recipe" assistant.
 *
 * The user describes a change ("make it dairy-free", "spicier", "half the
 * oil"). The assistant calls /api/recipe/edit in PREVIEW mode and shows a
 * card summarising the change; nothing is saved until the user clicks Apply.
 * Apply calls the same route with apply:true, which edits the owner's recipe
 * in place or creates/updates the user's single private "(My Version)" fork.
 *
 * Props:
 *   recipe    — the recipe currently shown (for context / id)
 *   onApplied — (updatedRecipe) => void — parent swaps local state to the
 *               edited recipe (and navigates if a fork was created)
 *   onClose   — optional close button handler
 */
export default function RecipeChatPanel({ recipe, onApplied, onClose }) {
  const { tier } = useSubscription()
  const entitled = canUseVoiceAssistant(tier)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  const push = useCallback((msg) => {
    setMessages(prev => [...prev, { id: nextId(), ...msg }])
  }, [])
  const patch = useCallback((id, updates) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // ── Send → preview ────────────────────────────────────────────────────────
  async function send(text) {
    const instruction = (text || '').trim()
    if (!instruction || busy) return
    setBusy(true)
    setInput('')
    push({ role: 'user', text: instruction })
    const cardId = nextId()
    setMessages(prev => [...prev, { id: cardId, role: 'assistant', thinking: true }])

    try {
      const res = await fetch('/api/recipe/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id, instruction }),
      })
      const data = await res.json()

      if (res.status === 403 && data.error === 'UPGRADE_REQUIRED') {
        patch(cardId, { thinking: false, upgrade: true })
        return
      }
      if (!res.ok) throw new Error(data.error || 'Edit failed')

      patch(cardId, {
        thinking: false,
        instruction,
        preview: data.recipe,
        summary: data.summary,
        willFork: data.willFork,
        isOwner: data.isOwner,
      })
    } catch (err) {
      patch(cardId, { thinking: false, error: err.message || 'Something went wrong — try again.' })
    } finally {
      setBusy(false)
    }
  }

  // ── Apply the previewed change ────────────────────────────────────────────
  async function applyChange(msg) {
    if (msg.applying || msg.applied) return
    patch(msg.id, { applying: true, error: null })
    try {
      const res = await fetch('/api/recipe/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id, instruction: msg.instruction, apply: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      patch(msg.id, { applying: false, applied: true, appliedFork: data.forked })
      onApplied?.(data.recipe, data)
    } catch (err) {
      patch(msg.id, { applying: false, error: err.message || 'Could not save — try again.' })
    }
  }

  // ── Paywall teaser ────────────────────────────────────────────────────────
  if (!entitled) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} color="var(--primary)" />
          <strong style={{ color: 'var(--text-1)', fontSize: 'var(--text-base)' }}>Adjust with AI</strong>
          <Lock size={14} color="var(--text-3)" />
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)', lineHeight: 1.5, margin: '0 0 0.75rem' }}>
          Tell Minty how to change this recipe — <em>"make it dairy-free"</em>, <em>"add more protein"</em> — and get an updated version. It saves as your own private copy.
        </p>
        <Link href="/pricing" style={{ display: 'inline-block', background: 'var(--primary)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          Unlock with Pro →
        </Link>
      </div>
    )
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
        <Sparkles size={16} color="var(--primary)" />
        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)', flex: 1 }}>Adjust this recipe with AI</strong>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ maxHeight: 320, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {messages.length === 0 && (
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-3)', lineHeight: 1.5 }}>
            Describe a change and I&apos;ll show you the result before saving anything — e.g. <em>&ldquo;make it dairy-free&rdquo;</em>, <em>&ldquo;less spicy&rdquo;</em>, <em>&ldquo;double the protein&rdquo;</em>.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '94%' }}>
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

            {m.thinking && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: '12px 12px 12px 4px', fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>
                ⏳ Reworking the recipe…
              </div>
            )}

            {m.upgrade && (
              <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '12px', fontSize: 'var(--text-sm)' }}>
                <div style={{ color: 'var(--text-1)', marginBottom: '0.375rem' }}>AI recipe editing is a Pro and Family feature.</div>
                <Link href="/pricing" style={{ color: 'var(--primary)', fontWeight: 700 }}>See plans →</Link>
              </div>
            )}

            {m.error && (
              <div style={{ padding: '0.625rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontSize: 'var(--text-sm)', color: '#dc2626' }}>
                {m.error}
              </div>
            )}

            {/* Preview card */}
            {m.preview && (
              <div style={{ marginTop: '0.375rem', padding: '0.75rem', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-1)' }}>{m.preview.title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 4, lineHeight: 1.45 }}>
                  ✓ {m.summary}
                </div>
                {m.preview.nutrition?.perServing?.energy_kcal != null && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 4 }}>
                    ≈ {Math.round(m.preview.nutrition.perServing.energy_kcal)} kcal
                    {m.preview.nutrition.perServing.protein != null ? ` · ${Math.round(m.preview.nutrition.perServing.protein)}g protein` : ''}
                    {' '}/ serving · {m.preview.base_servings} servings
                  </div>
                )}
                {m.willFork && !m.isOwner && (
                  <div style={{ fontSize: 'var(--text-xs)', color: '#b45309', marginTop: 6, lineHeight: 1.4 }}>
                    This isn&apos;t your recipe, so the change saves as your own private <strong>&ldquo;My Version&rdquo;</strong> copy (reused on future edits — no duplicates).
                  </div>
                )}

                {m.applied ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--primary)', fontWeight: 700, fontSize: 'var(--text-sm)' }}>
                    <Check size={16} /> {m.appliedFork ? 'Saved as your private copy' : 'Recipe updated'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem' }}>
                    <button
                      onClick={() => applyChange(m)}
                      disabled={m.applying}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: m.applying ? 'wait' : 'pointer', opacity: m.applying ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    >
                      <Check size={15} /> {m.applying ? 'Saving…' : (m.isOwner ? 'Apply to recipe' : 'Save as my version')}
                    </button>
                    <button
                      onClick={() => patch(m.id, { preview: null, dismissed: true })}
                      disabled={m.applying}
                      aria-label="Discard change"
                      style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      <RotateCcw size={15} /> Discard
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '0.375rem', padding: '0.625rem', borderTop: '1px solid var(--border)' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(input) }}
          placeholder="How should I change this recipe?"
          aria-label="Describe a recipe change"
          style={{ flex: 1, padding: '0.625rem 0.875rem', borderRadius: '22px', border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: 'var(--text-base)', outline: 'none' }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || busy}
          aria-label="Send"
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
    </div>
  )
}
