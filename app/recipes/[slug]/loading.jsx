export default function RecipeDetailLoading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Breadcrumb */}
      <div className="mf-skeleton" style={{ height: 14, width: 90, marginBottom: '1rem' }} />
      {/* Title */}
      <div className="mf-skeleton" style={{ height: 32, width: '70%', maxWidth: 560, marginBottom: '0.75rem' }} />
      {/* Meta chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[64, 80, 72].map((w, i) => (
          <div key={i} className="mf-skeleton" style={{ height: 26, width: w, borderRadius: 13 }} />
        ))}
      </div>
      {/* Hero image */}
      <div className="mf-skeleton" style={{ height: 320, width: '100%', maxWidth: 640, borderRadius: 12, marginBottom: '1.25rem' }} />
      {/* Description lines */}
      <div className="mf-skeleton" style={{ height: 15, width: '100%', marginBottom: 8 }} />
      <div className="mf-skeleton" style={{ height: 15, width: '92%', marginBottom: 8 }} />
      <div className="mf-skeleton" style={{ height: 15, width: '64%', marginBottom: '1.5rem' }} />
      {/* Steps */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mf-skeleton" style={{ height: 72, width: '100%', borderRadius: 12, marginBottom: 10 }} />
      ))}
    </div>
  )
}
