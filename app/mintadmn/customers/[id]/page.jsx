import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function CustomerDetailPage({ params }) {
  const { id } = await params
  const supabase = createAdminClient()

  const [
    { data: profile },
    { data: recipes },
    { data: menus },
    { data: memberships },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('recipes').select('id, name, meal_type, is_public, created_at').eq('created_by', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('menus').select('id, name, is_public, created_at').eq('created_by', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('family_memberships').select('family_id, role, families(name)').eq('profile_id', id),
  ])

  if (!profile) notFound()

  const allRecipes = recipes ?? []
  const allMenus = menus ?? []
  const allMemberships = memberships ?? []

  return (
    <div>
      <Link href="/admin/customers" style={{
        background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 14px',
        fontSize: 14, cursor: 'pointer', color: '#374151', marginBottom: 20,
        textDecoration: 'none', display: 'inline-block',
      }}>
        ← Back to Customers
      </Link>

      {/* Profile card */}
      <div style={{
        background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f0f0f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#2d6e2e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 17, flexShrink: 0,
          }}>
            {(profile.display_name || profile.email || '?').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 17, color: '#1f2937', margin: 0 }}>
              {profile.display_name || '—'}
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{profile.email}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 14 }}>
          <span style={{
            background: '#f0fdf4', color: '#2d6e2e', padding: '3px 10px',
            borderRadius: 999, fontWeight: 600,
          }}>
            {profile.role}
          </span>
          <span style={{
            background: '#f3f4f6', color: '#6b7280', padding: '3px 10px',
            borderRadius: 999, fontWeight: 600,
          }}>
            {profile.subscription_tier || 'free'}
          </span>
          <span style={{
            background: profile.is_active !== false ? '#dcfce7' : '#fef2f2',
            color: profile.is_active !== false ? '#2d6e2e' : '#dc2626',
            padding: '3px 10px', borderRadius: 999, fontSize: 14, fontWeight: 600,
          }}>
            {profile.is_active !== false ? 'active' : 'suspended'}
          </span>
          <span style={{ color: '#6b7280' }}>
            Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {/* Families */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 18px',
          border: '1px solid #f0f0f0',
        }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: '#6b7280', margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Families
          </h3>
          {allMemberships.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>None</p>
          ) : (
            allMemberships.map(m => (
              <div key={m.family_id} style={{
                fontSize: 14, padding: '4px 0', color: '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {m.families?.name || m.family_id}
                {m.role && (
                  <span style={{
                    fontSize: 12, background: '#dcfce7', color: '#2d6e2e',
                    padding: '1px 6px', borderRadius: 999, fontWeight: 600,
                  }}>
                    {m.role}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recipes */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 18px',
          border: '1px solid #f0f0f0',
        }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: '#6b7280', margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Recipes ({allRecipes.length})
          </h3>
          {allRecipes.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>None</p>
          ) : (
            allRecipes.slice(0, 6).map(r => (
              <div key={r.id} style={{
                fontSize: 14, padding: '4px 0', color: '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                {r.is_public && (
                  <span style={{
                    fontSize: 12, background: '#dcfce7', color: '#2d6e2e',
                    padding: '1px 6px', borderRadius: 999, fontWeight: 600, flexShrink: 0,
                  }}>
                    PUBLIC
                  </span>
                )}
              </div>
            ))
          )}
          {allRecipes.length > 6 && (
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              +{allRecipes.length - 6} more
            </p>
          )}
        </div>

        {/* Menus */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '16px 18px',
          border: '1px solid #f0f0f0',
        }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700, color: '#6b7280', margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Menus ({allMenus.length})
          </h3>
          {allMenus.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 14 }}>None</p>
          ) : (
            allMenus.slice(0, 6).map(m => (
              <div key={m.id} style={{
                fontSize: 14, padding: '4px 0', color: '#374151',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </span>
                {m.is_public && (
                  <span style={{
                    fontSize: 12, background: '#dcfce7', color: '#2d6e2e',
                    padding: '1px 6px', borderRadius: 999, fontWeight: 600, flexShrink: 0,
                  }}>
                    PUBLIC
                  </span>
                )}
              </div>
            ))
          )}
          {allMenus.length > 6 && (
            <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
              +{allMenus.length - 6} more
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
