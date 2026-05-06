'use client'

export default function Error({ error, reset }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Something went wrong</h1>
      <p>Please try refreshing the page.</p>
      <button
        onClick={() => reset()}
        style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}