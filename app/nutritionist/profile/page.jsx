import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = {
  title: 'Nutritionist Profile — MintyFit',
  description: 'View nutritionist profile, credentials, and bio.',
}

export default async function NutritionistProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?auth=login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio, credentials_url, avatar_url, email, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'nutritionist' && profile?.role !== 'super_admin') {
    redirect('/become-a-nutritionist')
  }

  const displayName = profile.display_name || 'Nutritionist'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      padding: '40px 16px 80px',
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: profile.avatar_url
              ? 'transparent'
              : 'var(--primary)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px', fontWeight: '700',
            margin: '0 auto 16px',
            overflow: 'hidden',
          }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              displayName[0].toUpperCase()
            )}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-1)', margin: '0 0 4px' }}>
            {displayName}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '15px', margin: 0 }}>
            MintyFit Nutritionist
          </p>
        </div>

        {profile.bio && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '20px', marginBottom: '16px',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              About
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: '15px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {profile.bio}
            </p>
          </div>
        )}

        {profile.credentials_url && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '20px', marginBottom: '16px',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Credentials
            </h2>
            <a
              href={profile.credentials_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--primary)', fontSize: '14px', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              {profile.credentials_url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            href="/become-a-nutritionist"
            style={{
              padding: '10px 24px', borderRadius: '10px',
              border: '1px solid var(--border)',
              color: 'var(--text-2)', textDecoration: 'none',
              fontSize: '14px', fontWeight: '500',
            }}
          >
            Edit profile
          </Link>
          <Link
            href="/nutritionist"
            style={{
              padding: '10px 24px', borderRadius: '10px',
              background: 'var(--primary)', color: '#fff',
              textDecoration: 'none', fontSize: '14px', fontWeight: '500',
            }}
          >
            My Clients
          </Link>
        </div>
      </div>
    </div>
  )
}
