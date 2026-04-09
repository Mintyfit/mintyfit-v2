'use client'

import { useState } from 'react'

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '20px', marginBottom: '16px',
    }}>
      {title && (
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

function Avatar({ name, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: size * 0.4,
      flexShrink: 0,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

function MemberRow({ member, isCurrentUser, userRole, onRoleChange, onRemove }) {
  const profile = member.profiles || {}
  const isAdmin = member.role === 'admin'
  const canManage = ['admin', 'co-admin'].includes(userRole) && !isCurrentUser

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <Avatar name={profile.name} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: 'var(--text-1)', fontSize: '14px' }}>
          {profile.name || 'Unknown'} {isCurrentUser && <span style={{ color: 'var(--text-3)', fontWeight: '400' }}>(you)</span>}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'capitalize' }}>
          {member.role}
        </div>
      </div>
      {canManage && (
        <div style={{ display: 'flex', gap: '6px' }}>
          {!isAdmin && (
            <button
              onClick={() => onRoleChange(profile.id, member.role === 'co-admin' ? 'member' : 'co-admin')}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                fontSize: '12px', color: 'var(--text-2)',
              }}
            >
              {member.role === 'co-admin' ? 'Demote' : 'Make co-admin'}
            </button>
          )}
          <button
            onClick={() => onRemove(profile.id, profile.name)}
            style={{
              background: 'none', border: '1px solid #fecaca',
              borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
              fontSize: '12px', color: '#ef4444',
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

function ManagedMemberRow({ member, canManage, onEdit, onRemove }) {
  const ageStr = member.date_of_birth
    ? `${Math.floor((Date.now() - new Date(member.date_of_birth)) / (1000 * 60 * 60 * 24 * 365))} yrs`
    : ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: '#e0e7ff', color: '#4f46e5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: '700', fontSize: '16px', flexShrink: 0,
      }}>
        👶
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: 'var(--text-1)', fontSize: '14px' }}>
          {member.name} <span style={{ color: 'var(--text-3)', fontWeight: '400', fontSize: '12px' }}>managed</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          {ageStr}{member.weight && ` · ${member.weight} kg`}{member.height && ` · ${member.height} cm`}
        </div>
      </div>
      {canManage && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onEdit(member)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
              fontSize: '12px', color: 'var(--text-2)',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onRemove(member.id, member.name)}
            style={{
              background: 'none', border: '1px solid #fecaca',
              borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
              fontSize: '12px', color: '#ef4444',
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

function AddChildModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', date_of_birth: '', gender: '', weight: '', height: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleAdd() {
    if (!form.name) return setError('Name is required')
    setSaving(true)
    try {
      const res = await fetch('/api/family/managed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      const { member } = await res.json()
      onAdd(member)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--border)', borderRadius: '8px',
    background: 'var(--bg-page)', color: 'var(--text-1)',
    fontSize: '14px',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '20px' }}>Add child</h3>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Name *', key: 'name', type: 'text' },
            { label: 'Date of birth', key: 'date_of_birth', type: 'date' },
            { label: 'Weight (kg)', key: 'weight', type: 'number' },
            { label: 'Height (cm)', key: 'height', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '4px', fontWeight: '500' }}>{f.label}</label>
              <input
                type={f.type} value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '4px', fontWeight: '500' }}>Gender</label>
            <select value={form.gender} onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))} style={inputStyle}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-2)' }}>Cancel</button>
          <button onClick={handleAdd} disabled={saving} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Adding…' : 'Add child'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NoFamilyView({ onCreateFamily, onCreate }) {
  const [familyName, setFamilyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  async function handleCreate() {
    if (!familyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/family/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error)
        return
      }
      onCreate()
    } catch {
      alert('Failed to create family')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '40px', textAlign: 'center',
      maxWidth: '500px', margin: '0 auto',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍👩‍👧‍👦</div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '8px' }}>
        You&apos;re not part of a family yet
      </h2>
      <p style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '24px' }}>
        Create a family to share meal plans, portions, and shopping lists with your loved ones.
      </p>

      {showCreate ? (
        <div style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px', fontWeight: '500' }}>
            Family name
          </label>
          <input
            type="text"
            placeholder="The Smith Family"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)',
              fontSize: '14px', marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowCreate(false)}
              style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !familyName.trim()}
              style={{ flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', opacity: creating ? 0.7 : 1 }}
            >
              {creating ? 'Creating…' : 'Create family'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCreate(true)}
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            Create a family
          </button>
        </div>
      )}
    </div>
  )
}

export default function MyFamilyClient({ userId, initialData }) {
  const [data, setData] = useState(initialData)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [showAddChild, setShowAddChild] = useState(false)
  const [error, setError] = useState(null)

  const { family, memberships, managedMembers, invites, userRole } = data
  const canManage = ['admin', 'co-admin'].includes(userRole)

  async function sendInvite() {
    if (!inviteEmail) return
    setInviting(true)
    setError(null)
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setInviteResult(d.inviteUrl)
      setInviteEmail('')
      setData(prev => ({ ...prev, invites: [d.invite, ...prev.invites] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(memberId, newRole) {
    try {
      const res = await fetch('/api/family/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })
      if (!res.ok) throw new Error('Failed to update role')
      setData(prev => ({
        ...prev,
        memberships: prev.memberships.map(m =>
          m.profile_id === memberId ? { ...m, role: newRole } : m
        ),
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemoveMember(memberId, name) {
    if (!confirm(`Remove ${name} from the family?`)) return
    try {
      const res = await fetch(`/api/family/members?memberId=${memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove member')
      setData(prev => ({
        ...prev,
        memberships: prev.memberships.filter(m => m.profile_id !== memberId),
      }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleLeaveFamily() {
    if (!confirm('Leave the family? You will lose access to shared plans.')) return
    try {
      await fetch(`/api/family/members?memberId=${userId}`, { method: 'DELETE' })
      window.location.reload()
    } catch {}
  }

  async function handleRemoveManaged(id, name) {
    if (!confirm(`Remove ${name} from the family?`)) return
    try {
      await fetch(`/api/family/managed?id=${id}`, { method: 'DELETE' })
      setData(prev => ({ ...prev, managedMembers: prev.managedMembers.filter(m => m.id !== id) }))
    } catch (err) {
      setError(err.message)
    }
  }

  if (!family) {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 80px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '24px' }}>My Family</h1>
        <NoFamilyView onCreate={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '4px' }}>
          {family.name}
        </h1>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
          {memberships.length} linked member{memberships.length !== 1 ? 's' : ''}
          {managedMembers.length > 0 && ` · ${managedMembers.length} managed child${managedMembers.length !== 1 ? 'ren' : ''}`}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Linked members */}
      <Section title="Members">
        {memberships.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            isCurrentUser={m.profile_id === userId}
            userRole={userRole}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveMember}
          />
        ))}

        {managedMembers.map(m => (
          <ManagedMemberRow
            key={m.id}
            member={m}
            canManage={canManage}
            onEdit={() => {}}
            onRemove={handleRemoveManaged}
          />
        ))}

        {/* Actions */}
        {canManage && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="Invite by email…"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{
                    flex: 1, padding: '10px 12px', border: '1px solid var(--border)',
                    borderRadius: '8px', background: 'var(--bg-page)', color: 'var(--text-1)', fontSize: '14px',
                  }}
                />
                <button
                  onClick={sendInvite}
                  disabled={inviting || !inviteEmail}
                  style={{
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    borderRadius: '8px', padding: '10px 16px', cursor: 'pointer',
                    fontSize: '14px', opacity: (inviting || !inviteEmail) ? 0.6 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {inviting ? 'Sending…' : 'Invite'}
                </button>
              </div>
              {inviteResult && (
                <div style={{ marginTop: '8px', padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12px', color: '#15803d' }}>
                  Invite link: <span style={{ fontWeight: '600', wordBreak: 'break-all' }}>{inviteResult}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteResult)}
                    style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '12px' }}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAddChild(true)}
              style={{
                background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)',
                borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap',
              }}
            >
              + Add child
            </button>
          </div>
        )}

        {!canManage && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleLeaveFamily}
              style={{
                background: 'none', border: '1px solid #fecaca', color: '#ef4444',
                borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px',
              }}
            >
              Leave family
            </button>
          </div>
        )}
      </Section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Section title="Pending invites">
          {invites.filter(i => i.status === 'pending').map(invite => (
            <div key={invite.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '14px',
            }}>
              <div>
                <span style={{ color: 'var(--text-1)', fontWeight: '500' }}>{invite.email}</span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px', marginLeft: '8px' }}>
                  Sent {new Date(invite.created_at).toLocaleDateString()}
                </span>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: '10px',
                background: '#fef9c3', color: '#a16207', fontSize: '12px',
              }}>
                Pending
              </span>
            </div>
          ))}
        </Section>
      )}

      {showAddChild && (
        <AddChildModal
          onClose={() => setShowAddChild(false)}
          onAdd={member => setData(prev => ({ ...prev, managedMembers: [...prev.managedMembers, member] }))}
        />
      )}
    </div>
  )
}
