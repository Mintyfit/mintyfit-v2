import { createClient } from '@/lib/supabase/server'
import BecomeNutritionistClient from '@/components/account/BecomeNutritionistClient'

export const metadata = {
  title: 'Become a Nutritionist — MintyFit',
  description: 'Join MintyFit as a nutritionist and help families achieve their nutrition goals.',
}

export default async function BecomeNutritionistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let alreadyApplied = false
  let isNutritionist = false

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_approved, display_name, email, bio, credentials_url')
      .eq('id', user.id)
      .single()
    profile = data
    alreadyApplied = data?.is_approved === false
    isNutritionist = data?.role === 'nutritionist'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      padding: '24px 16px 80px',
    }}>
      <BecomeNutritionistClient
        user={user ? { id: user.id, email: user.email } : null}
        profile={profile}
        alreadyApplied={alreadyApplied}
        isNutritionist={isNutritionist}
      />
    </div>
  )
}
