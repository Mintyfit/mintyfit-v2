'use client'

import { useState, useTransition } from 'react'
import { generateNow, removeReports, resendEmail, saveRecipients } from './actions'

const btn = {
  background: '#2d6e2e', color: 'white', border: 'none', borderRadius: 10,
  padding: '8px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
}
const btnSecondary = { ...btn, background: 'white', color: '#374151', border: '1px solid #e5e7eb' }
const btnDanger = { ...btn, background: 'white', color: '#b91c1c', border: '1px solid #fecaca' }

export function GenerateButton() {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <button
        style={btn}
        disabled={pending}
        onClick={() => {
          setMessage('')
          startTransition(async () => {
            try {
              const r = await generateNow()
              setMessage(`Report generated (${r.insights} findings${r.errors.length ? `, ${r.errors.length} data gaps` : ''}).`)
            } catch (e) {
              setMessage(`Error: ${e.message}`)
            }
          })
        }}
      >
        {pending ? 'Generating… (1–3 min)' : 'Generate now'}
      </button>
      {message && <span style={{ fontSize: 13, color: '#6b7280' }}>{message}</span>}
    </span>
  )
}

export function DeleteButton({ id, week }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      style={btnDanger}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete report ${week}?`)) return
        startTransition(async () => {
          const fd = new FormData()
          fd.set('ids', String(id))
          await removeReports(fd)
        })
      }}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  )
}

export function ResendButton({ id }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        style={btnSecondary}
        disabled={pending}
        onClick={() => {
          setMessage('')
          startTransition(async () => {
            try {
              const fd = new FormData()
              fd.set('id', String(id))
              const r = await resendEmail(fd)
              setMessage(r.success ? `Sent to ${r.recipients}` : `Failed: ${r.error}`)
            } catch (e) {
              setMessage(`Error: ${e.message}`)
            }
          })
        }}
      >
        {pending ? 'Sending…' : 'Send e-mail'}
      </button>
      {message && <span style={{ fontSize: 13, color: '#6b7280' }}>{message}</span>}
    </span>
  )
}

export function RecipientsForm({ initial }) {
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setMessage('')
        startTransition(async () => {
          try {
            const fd = new FormData()
            fd.set('recipients', value)
            const r = await saveRecipients(fd)
            setMessage(`Saved — ${r.count} recipient(s).`)
          } catch (err) {
            setMessage(`Error: ${err.message}`)
          }
        })
      }}
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="one@example.com, two@example.com"
        style={{
          border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 14px',
          fontSize: 14, outline: 'none', flex: 1, minWidth: 260, fontFamily: 'inherit',
        }}
      />
      <button type="submit" style={btn} disabled={pending}>
        {pending ? 'Saving…' : 'Save recipients'}
      </button>
      {message && <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>{message}</span>}
    </form>
  )
}
