export default function StatisticsLoading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header + period selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="mf-skeleton" style={{ height: 28, width: 200 }} />
        <div className="mf-skeleton" style={{ height: 36, width: 260, borderRadius: 18 }} />
      </div>
      {/* Member cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mf-skeleton" style={{ height: 120, borderRadius: 12 }} />
        ))}
      </div>
      {/* Nutrient bars */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div className="mf-skeleton" style={{ height: 13, width: 140, marginBottom: 6 }} />
          <div className="mf-skeleton" style={{ height: 10, width: '100%', borderRadius: 5 }} />
        </div>
      ))}
    </div>
  )
}
