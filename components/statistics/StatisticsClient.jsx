'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

function computeNutritionTotals(entries, memberId) {
  const memberEntries = entries.filter(e => e.member_id === memberId)
  const totals = {}
  for (const entry of memberEntries) {
    const n = entry.personal_nutrition || {}
    for (const key of Object.keys(n)) {
      totals[key] = (totals[key] || 0) + (n[key] || 0)
    }
  }
  return totals
}

function getCompleteness(totals, nutritionFields) {
  const fields = nutritionFields.filter(f => f.rda)
  if (!fields.length) return 0
  let met = 0
  for (const f of fields) {
    if ((totals[f.key] || 0) >= f.rda * 0.7) met++
  }
  return Math.round((met / fields.length) * 100)
}

function getDeficiencies(totals, nutritionFields) {
  return nutritionFields
    .filter(f => f.rda && (totals[f.key] || 0) < f.rda * 0.7)
    .map(f => ({
      ...f,
      pct: Math.round(((totals[f.key] || 0) / f.rda) * 100),
    }))
    .sort((a, b) => a.pct - b.pct)
}

function NutritionBar({ label, value, rda, unit }) {
  if (!rda) return null
  const pct = Math.min(Math.round((value / rda) * 100), 150)
  const color = pct >= 100 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-2)' }}>{label}</span>
        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function MacroDonut({ calories, protein, carbs, fat, size = 80 }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (!total) return <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--border)' }} />
  const proteinDeg = (protein * 4 / total) * 360
  const carbsDeg = (carbs * 4 / total) * 360
  const fatDeg = (fat * 9 / total) * 360
  return (
    <svg width={size} height={size} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3.8" />
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3.8"
        strokeDasharray={`${proteinDeg / 360 * 100} ${100 - proteinDeg / 360 * 100}`}
        strokeDashoffset="25" transform="rotate(-90 18 18)" />
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3.8"
        strokeDasharray={`${carbsDeg / 360 * 100} ${100 - carbsDeg / 360 * 100}`}
        strokeDashoffset={25 - proteinDeg / 360 * 100}
        transform="rotate(-90 18 18)" />
      <text x="18" y="20.5" textAnchor="middle" fontSize="7" fill="var(--text-1)" fontWeight="600">
        {Math.round(calories)}
      </text>
      <text x="18" y="26" textAnchor="middle" fontSize="4" fill="var(--text-3)">kcal</text>
    </svg>
  )
}

function MemberCard({ member, totals, nutritionFields, onClick, isCurrentUser }) {
  const completeness = getCompleteness(totals, nutritionFields)
  const deficiencies = getDeficiencies(totals, nutritionFields).slice(0, 3)
  const barColor = completeness >= 80 ? '#22c55e' : completeness >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '16px',
        }}>
          {(member.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: '600', color: 'var(--text-1)' }}>
            {member.name}{isCurrentUser && ' (you)'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>This week</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: barColor }}>{completeness}%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>targets met</div>
        </div>
      </div>

      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', marginBottom: '12px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${completeness}%`, background: barColor, borderRadius: '4px', transition: 'width 0.4s' }} />
      </div>

      {deficiencies.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {deficiencies.map(d => (
            <span key={d.key} style={{
              padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
              background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
            }}>
              {d.label} {d.pct}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function InsightCard({ calendarEntries, nutritionFields, userId }) {
  // Find nutrient with longest streak below 70%
  const nutrientStreaks = {}
  for (const f of nutritionFields.filter(n => n.rda)) {
    nutrientStreaks[f.key] = { label: f.label, count: 0 }
  }

  // Group by date
  const byDate = {}
  for (const e of calendarEntries) {
    if (!byDate[e.date_str]) byDate[e.date_str] = {}
    const n = e.personal_nutrition || {}
    for (const key of Object.keys(n)) {
      byDate[e.date_str][key] = (byDate[e.date_str][key] || 0) + (n[key] || 0)
    }
  }

  const dates = Object.keys(byDate).sort()
  for (const f of nutritionFields.filter(n => n.rda)) {
    let streak = 0
    for (const date of dates) {
      if ((byDate[date][f.key] || 0) < f.rda * 0.7) streak++
    }
    nutrientStreaks[f.key].count = streak
  }

  const worst = Object.entries(nutrientStreaks).sort((a, b) => b[1].count - a[1].count)[0]
  if (!worst || worst[1].count < 2) return null

  return (
    <div style={{
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '24px',
    }}>
      <span style={{ fontSize: '24px' }}>💡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
          Your family has been below 70% on {worst[1].label} for {worst[1].count} days.
        </div>
        <div style={{ fontSize: '14px', color: '#b45309' }}>
          <Link href={`/recipes?nutrient=${worst[0]}`} style={{ color: '#d97706', fontWeight: '500' }}>
            See recipes high in {worst[1].label} →
          </Link>
        </div>
      </div>
    </div>
  )
}

function IndividualDetail({ member, totals, nutritionFields, weightLogs, onBack }) {
  const [showAll, setShowAll] = useState(false)

  const bigFour = ['energy_kcal', 'protein', 'carbs_total', 'fat_total']
  const fields = showAll ? nutritionFields : nutritionFields.filter(f => f.rda).slice(0, 20)

  const calories = totals.energy_kcal || 0
  const protein = totals.protein || 0
  const carbs = totals.carbs_total || 0
  const fat = totals.fat_total || 0

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontSize: '14px', fontWeight: '500',
          marginBottom: '20px', padding: '0',
        }}
      >
        ← Back to family view
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '22px',
        }}>
          {(member.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-1)' }}>{member.name}</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Last 7 days nutrition summary</div>
        </div>
      </div>

      {/* Macro Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Calories', value: Math.round(calories), unit: 'kcal', color: '#8b5cf6' },
          { label: 'Protein', value: Math.round(protein), unit: 'g', color: '#3b82f6' },
          { label: 'Carbs', value: Math.round(carbs), unit: 'g', color: '#f59e0b' },
          { label: 'Fat', value: Math.round(fat), unit: 'g', color: '#ef4444' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{m.unit}/week</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Donut */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '20px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap',
      }}>
        <MacroDonut calories={calories} protein={protein} carbs={carbs} fat={fat} size={100} />
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '8px', fontWeight: '600' }}>Macro breakdown</div>
          {[
            { label: 'Protein', color: '#3b82f6', g: protein },
            { label: 'Carbs', color: '#f59e0b', g: carbs },
            { label: 'Fat', color: '#ef4444', g: fat },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: m.color }} />
              <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{m.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: '600', color: 'var(--text-1)' }}>{Math.round(m.g)}g</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weight sparkline */}
      {weightLogs.length > 1 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px', marginBottom: '24px',
        }}>
          <div style={{ fontWeight: '600', color: 'var(--text-1)', marginBottom: '12px' }}>Weight trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
            {weightLogs.slice(0, 14).reverse().map((log, i) => {
              const weights = weightLogs.slice(0, 14).map(l => l.weight)
              const min = Math.min(...weights)
              const max = Math.max(...weights)
              const range = max - min || 1
              const h = Math.max(8, Math.round(((log.weight - min) / range) * 52 + 8))
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '100%', height: `${h}px`, background: 'var(--primary)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Current: {weightLogs[0]?.weight} kg · Logged {weightLogs.length} times
          </div>
        </div>
      )}

      {/* All 47 nutrients */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-1)' }}>Nutrient completeness (weekly totals)</div>
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '6px', padding: '4px 12px', cursor: 'pointer',
              fontSize: '12px', color: 'var(--text-2)',
            }}
          >
            {showAll ? 'Show less' : 'Show all 47'}
          </button>
        </div>
        {fields.map(f => (
          <NutritionBar
            key={f.key}
            label={f.label}
            value={totals[f.key] || 0}
            rda={f.rda ? f.rda * 7 : null}
            unit={f.unit}
          />
        ))}
      </div>
    </div>
  )
}

export default function StatisticsClient({ userId, initialData, nutritionFields }) {
  const [selectedMember, setSelectedMember] = useState(null)
  const [dateRange, setDateRange] = useState('7days')

  const {
    profile,
    familyMembers,
    managedMembers,
    calendarEntries,
    journalEntries,
    weightLogs,
    nutritionistNotes,
  } = initialData

  // Build member list: current user + linked family members
  const allMembers = useMemo(() => {
    const current = { id: userId, name: profile?.name || 'You', isCurrentUser: true }
    const linked = familyMembers.filter(m => m.id !== userId).map(m => ({ id: m.id, name: m.name }))
    return [current, ...linked]
  }, [userId, profile, familyMembers])

  const memberTotals = useMemo(() => {
    const result = {}
    for (const m of allMembers) {
      result[m.id] = computeNutritionTotals(calendarEntries, m.id)
    }
    return result
  }, [allMembers, calendarEntries])

  const selectedMemberObj = selectedMember ? allMembers.find(m => m.id === selectedMember) : null

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text-1)', marginBottom: '4px' }}>
          Nutrition Statistics
        </h1>
        <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>
          {selectedMember ? 'Individual detail' : 'Family overview · Last 7 days'}
        </p>
      </div>

      {/* Nutritionist notes */}
      {nutritionistNotes.length > 0 && !selectedMember && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '12px', padding: '16px', marginBottom: '20px',
        }}>
          {nutritionistNotes.slice(0, 1).map((note, i) => (
            <div key={i}>
              <div style={{ fontSize: '12px', color: '#166534', fontWeight: '500', marginBottom: '6px' }}>
                📝 Note from your nutritionist
              </div>
              <div style={{ color: '#15803d', fontSize: '14px' }}>&ldquo;{note.content}&rdquo;</div>
            </div>
          ))}
        </div>
      )}

      {selectedMember ? (
        <IndividualDetail
          member={selectedMemberObj}
          totals={memberTotals[selectedMember] || {}}
          nutritionFields={nutritionFields}
          weightLogs={weightLogs}
          onBack={() => setSelectedMember(null)}
        />
      ) : (
        <>
          <InsightCard
            calendarEntries={calendarEntries}
            nutritionFields={nutritionFields}
            userId={userId}
          />

          {allMembers.length === 0 && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '40px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontWeight: '600', color: 'var(--text-1)', marginBottom: '8px' }}>No nutrition data yet</div>
              <div style={{ color: 'var(--text-3)', fontSize: '14px', marginBottom: '20px' }}>
                Add recipes to your meal plan to see nutrition statistics
              </div>
              <Link href="/plan" style={{
                display: 'inline-block', background: 'var(--primary)', color: '#fff',
                padding: '10px 24px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '14px', fontWeight: '500',
              }}>
                Open Planner →
              </Link>
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px' }}>
            {allMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                totals={memberTotals[member.id] || {}}
                nutritionFields={nutritionFields}
                isCurrentUser={member.isCurrentUser}
                onClick={() => setSelectedMember(member.id)}
              />
            ))}
          </div>

          {calendarEntries.length > 0 && (
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px', marginTop: '20px',
              textAlign: 'center',
            }}>
              <div style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '8px' }}>
                Based on {calendarEntries.length} meal entries in the last 7 days
              </div>
              <Link href="/plan" style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>
                View your meal plan →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
