export default function PlanLoading() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.25rem 1.25rem 5rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div className="mf-skeleton" style={{ height: 28, width: 140, marginBottom: 6 }} />
          <div className="mf-skeleton" style={{ height: 14, width: 180 }} />
        </div>
        <div className="mf-skeleton" style={{ height: 36, width: 220, borderRadius: 18 }} />
      </div>
      {/* Week grid — 7 day columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: '1.25rem' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="mf-skeleton" style={{ height: 110, borderRadius: 10 }} />
        ))}
      </div>
      {/* Day agenda lines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mf-skeleton" style={{ height: 64, borderRadius: 10, marginBottom: 10 }} />
          ))}
        </div>
        <div className="mf-skeleton" style={{ height: 260, borderRadius: 12 }} />
      </div>
    </div>
  )
}
