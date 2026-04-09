'use client'

import { useState, useOptimistic, useTransition, useCallback } from 'react'
import { groupItemsByCategory, generateShareText } from '@/lib/shopping/utils'

// ── Category section (collapsible) ───────────────────────────────────────────
function CategorySection({ group, onToggle, onDelete }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.375rem 0', marginBottom: open ? '0.5rem' : 0,
        }}
      >
        <h3 style={{
          margin: 0, fontSize: '0.8125rem', fontWeight: 700,
          color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', gap: '0.375rem',
        }}>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth="2"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}
          >
            <polyline points="4 2 9 6 4 10"/>
          </svg>
          {group.label}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-4)', fontWeight: 400 }}>
          {group.items.length} item{group.items.length !== 1 ? 's' : ''}
        </span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {group.items.map(item => (
            <ItemRow key={item.id} item={item} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Item row ─────────────────────────────────────────────────────────────────
function ItemRow({ item, onToggle, onDelete }) {
  const qty = item.amount ? `${item.amount}${item.unit ? ' ' + item.unit : ''}` : ''
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.625rem 0.875rem', borderRadius: '10px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      opacity: item.checked ? 0.55 : 1,
      transition: 'opacity 0.15s',
    }}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.checked)}
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
        style={{
          width: 22, height: 22, borderRadius: '6px', flexShrink: 0,
          border: `2px solid ${item.checked ? 'var(--primary)' : 'var(--border)'}`,
          background: item.checked ? 'var(--primary)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        {item.checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2">
            <polyline points="2 6 5 9 10 3"/>
          </svg>
        )}
      </button>

      {/* Name + qty */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: '0.9375rem', color: 'var(--text-1)',
          textDecoration: item.checked ? 'line-through' : 'none',
          fontWeight: 500,
        }}>
          {item.ingredient_name}
        </span>
        {qty && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-3)' }}>
            {qty}
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        aria-label="Remove item"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-4)', padding: '0.25rem', borderRadius: '4px',
          display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-4)'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}

// ── Add item form ─────────────────────────────────────────────────────────────
function AddItemForm({ onAdd }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onAdd({ ingredient_name: name.trim(), amount: parseFloat(amount) || null, unit: unit.trim() || null })
    setName('')
    setAmount('')
    setUnit('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Item name…"
        required
        style={{
          flex: '3 1 140px', padding: '0.625rem 0.875rem', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none',
        }}
      />
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Qty"
        min="0"
        step="any"
        style={{
          flex: '1 1 60px', maxWidth: '80px', padding: '0.625rem 0.75rem', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none',
        }}
      />
      <input
        type="text"
        value={unit}
        onChange={e => setUnit(e.target.value)}
        placeholder="Unit"
        style={{
          flex: '1 1 60px', maxWidth: '80px', padding: '0.625rem 0.75rem', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          color: 'var(--text-1)', fontSize: '0.9375rem', outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={loading || !name.trim()}
        style={{
          padding: '0.625rem 1.25rem', borderRadius: '8px',
          border: 'none', background: 'var(--primary)', color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9375rem', fontWeight: 600,
          opacity: loading ? 0.7 : 1,
          flexShrink: 0,
        }}
      >
        + Add
      </button>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ShoppingListClient({ initialList, initialItems }) {
  const [items, setItems] = useState(initialItems || [])
  const [shareToast, setShareToast] = useState('')
  const [, startTransition] = useTransition()

  const grouped = groupItemsByCategory(items)
  const uncheckedCount = items.filter(i => !i.checked).length
  const checkedCount = items.filter(i => i.checked).length

  // ── Toggle checked ──────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (itemId, checked) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked } : i))
    try {
      await fetch('/api/shopping-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, checked }),
      })
    } catch {
      // revert on failure
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, checked: !checked } : i))
    }
  }, [])

  // ── Delete item ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (itemId) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    try {
      await fetch('/api/shopping-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })
    } catch {
      // Re-fetch on failure is tricky without the original item; just leave the optimistic state
    }
  }, [])

  // ── Add item ────────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async (newItem) => {
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newItem }),
      })
      const data = await res.json()
      if (data.items) setItems(data.items)
    } catch {}
  }, [])

  // ── Clear checked ───────────────────────────────────────────────────────────
  async function handleClearChecked() {
    setItems(prev => prev.filter(i => !i.checked))
    try {
      await fetch('/api/shopping-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_checked: true }),
      })
    } catch {}
  }

  // ── Refresh from plan ───────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false)
  async function handleRefreshFromPlan() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_from_plan' }),
      })
      const data = await res.json()
      if (data.items) setItems(data.items)
    } catch {}
    setRefreshing(false)
  }

  // ── Share ───────────────────────────────────────────────────────────────────
  async function handleShare() {
    const text = generateShareText(grouped, initialList?.name || 'Shopping List')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Shopping List', text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareToast('Copied to clipboard!')
        setTimeout(() => setShareToast(''), 2500)
      }
    } catch {}
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-1)' }}>
            🛒 {initialList?.name || 'Shopping List'}
          </h1>
          {items.length > 0 && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-3)' }}>
              {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} remaining
              {checkedCount > 0 && ` · ${checkedCount} checked`}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefreshFromPlan}
            disabled={refreshing}
            title="Regenerate list from this week's planner"
            style={{
              padding: '0.5rem 0.875rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-2)', cursor: refreshing ? 'wait' : 'pointer', fontSize: '0.8125rem',
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? '⏳' : '🔄'} Refresh from plan
          </button>
          {checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              title="Remove all checked items"
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.8125rem',
              }}
            >
              ✓ Clear checked
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={handleShare}
              title="Share or copy list"
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.8125rem',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}
            >
              📤 Share
            </button>
          )}
        </div>
      </div>

      {/* Add item form */}
      <AddItemForm onAdd={handleAdd} />

      {/* Share toast */}
      {shareToast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-1)', color: 'var(--bg-page)',
          padding: '0.625rem 1.25rem', borderRadius: '20px',
          fontSize: '0.875rem', fontWeight: 500, zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {shareToast}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-4)' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛒</p>
          <p style={{ fontSize: '1rem', marginBottom: '0.375rem', color: 'var(--text-3)' }}>Your list is empty</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-4)' }}>
            Add items above, or go to a <a href="/recipes" style={{ color: 'var(--primary)' }}>recipe</a> or{' '}
            <a href="/menus" style={{ color: 'var(--primary)' }}>meal plan</a> and tap "Add to list".
          </p>
        </div>
      )}

      {/* Grouped items */}
      {grouped.length > 0 && grouped.map(group => (
        <CategorySection
          key={group.key}
          group={group}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
