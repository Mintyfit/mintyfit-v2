export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>404 — Page not found</h1>
      <p style={{ color: 'var(--text-3)', marginTop: '0.75rem' }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <a href="/" style={{ color: 'var(--primary)', marginTop: '1.5rem', display: 'inline-block' }}>
        Go home
      </a>
    </div>
  )
}
