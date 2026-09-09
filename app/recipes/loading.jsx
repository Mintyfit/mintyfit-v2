export default function RecipesLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header + search */}
      <div className="mf-skeleton" style={{ height: 34, width: 220, marginBottom: '0.75rem' }} />
      <div className="mf-skeleton" style={{ height: 44, width: '100%', maxWidth: 480, marginBottom: '1rem' }} />
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[72, 88, 64, 80, 72].map((w, i) => (
          <div key={i} className="mf-skeleton" style={{ height: 32, width: w, borderRadius: 16 }} />
        ))}
      </div>
      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
            <div className="mf-skeleton" style={{ height: 160, borderRadius: 0 }} />
            <div style={{ padding: '0.875rem' }}>
              <div className="mf-skeleton" style={{ height: 18, width: '85%', marginBottom: 8 }} />
              <div className="mf-skeleton" style={{ height: 13, width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
