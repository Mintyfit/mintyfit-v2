'use client'

import { useState } from 'react'
import Link from 'next/link'

function ClientCard({ client, onLeaveNote }) {
  const { profile, avgCalories, recentNotes, lastActivity, calendarEntries } = client
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  async function submitNote() {
    if (!noteText.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/nutritionist/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: profile.id, content: noteText }),
      })
      if (!res.ok) throw new Error('Failed to save note')
      const { note } = await res.json()
      onLeaveNote(profile.id, note)
      setNoteText('')
      setShowNoteForm(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingNote(false)
    }
  }

  const daysSinceActive = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity)) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '20px', flexShrink: 0,
        }}>
          {(profile?.name || 'C')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', color: 'var(--text-1)', fontSize: '16px' }}>
            {profile?.name || 'Client'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            {daysSinceActive === null ? 'No activity' :
             daysSinceActive === 0 ? 'Active today' :
             daysSinceActive === 1 ? 'Active yesterday' :
             `Active ${daysSinceActive} days ago`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {avgCalories && (
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{avgCalories}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>avg kcal/day</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '12px', background: 'var(--bg-page)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          {calendarEntries.length} meal entries (7d)
        </span>
        {profile?.subscription_tier && (
          <span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', textTransform: 'capitalize' }}>
            {profile.subscription_tier}
          </span>
        )}
      </div>

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: '500', marginBottom: '6px' }}>Your notes</div>
          {recentNotes.map(note => (
            <div key={note.id} style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
              padding: '8px 12px', marginBottom: '6px', fontSize: '13px', color: '#15803d',
            }}>
              <div>{note.content}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>
                {new Date(note.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href={`/statistics?clientId=${profile.id}`} style={{
          padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
          color: 'var(--text-2)', textDecoration: 'none', fontSize: '13px',
        }}>
          View stats
        </Link>
        <Link href={`/plan?clientId=${profile.id}`} style={{
          padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)',
          color: 'var(--text-2)', textDecoration: 'none', fontSize: '13px',
        }}>
          View plan
        </Link>
        <button
          onClick={() => setShowNoteForm(v => !v)}
          style={{
            padding: '8px 14px', borderRadius: '8px',
            background: 'var(--primary)', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: '13px',
          }}
        >
          Leave note
        </button>
      </div>

      {showNoteForm && (
        <div style={{ marginTop: '12px' }}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Write a professional note for your client…"
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              border: '1px solid var(--border)', borderRadius: '8px',
              background: 'var(--bg-page)', color: 'var(--text-1)',
              fontSize: '14px', resize: 'vertical', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowNoteForm(false); setNoteText('') }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-2)' }}
            >
              Cancel
            </button>
            <button
              onClick={submitNote}
              disabled={savingNote || !noteText.trim()}
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', opacity: (savingNote || !noteText.trim()) ? 0.6 : 1 }}
            >
              {savingNote ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NutritionistClient({ userId, nutritionistName, initialData }) {
  const [clientData, setClientData] = useState(initialData.clientData)

  function handleLeaveNote(clientId, note) {
    setClientData(prev => prev.map(c =>
      c.profile.id === clientId
        ? { ...c, recentNotes: [note, ...c.recentNotes] }
        : c
    ))
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '4px' }}>
          Your Clients
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>
          {clientData.length} active client{clientData.length !== 1 ? 's' : ''}
        </p>
      </div>

      {clientData.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🩺</div>
          <div style={{ fontWeight: '600', color: 'var(--text-1)', marginBottom: '8px' }}>No clients yet</div>
          <div style={{ color: 'var(--text-3)', fontSize: '14px' }}>
            Clients can connect to you from their MintyFit profile by entering your email address.
          </div>
        </div>
      ) : (
        <div>
          {clientData.map(client => (
            <ClientCard
              key={client.link.id}
              client={client}
              onLeaveNote={handleLeaveNote}
            />
          ))}
        </div>
      )}

      {/* Pending invites */}
      {initialData.allLinks.filter(l => l.status !== 'active').length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-2)', marginBottom: '12px' }}>Inactive connections</h2>
          {initialData.allLinks.filter(l => l.status !== 'active').map(link => (
            <div key={link.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '8px', marginBottom: '8px', fontSize: '14px',
            }}>
              <span style={{ color: 'var(--text-2)' }}>{link.profiles?.name}</span>
              <span style={{ color: 'var(--text-3)', textTransform: 'capitalize' }}>{link.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
