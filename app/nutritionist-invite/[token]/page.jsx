import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NutritionistInviteClient from '@/components/nutritionist/NutritionistInviteClient'

export const metadata = {
  title: 'Nutritionist Invite — MintyFit',
  description: 'Connect with your nutritionist on MintyFit.',
}

async function getInviteData(token, supabase) {
  try {
    const { data: invite } = await supabase
      .from('nutritionist_invites')
      .select('id, nutritionist_id, email, status, expires_at, profiles(id, name)')
      .eq('token', token)
      .single()

    if (!invite) return { error: 'Invalid or expired invite link.' }
    if (invite.status !== 'pending') return { error: 'This invite has already been used or cancelled.' }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { error: 'This invite link has expired.' }
    }

    return { invite }
  } catch {
    return { error: 'Invalid or expired invite link.' }
  }
}

export default async function NutritionistInvitePage({ params }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { invite, error } = await getInviteData(token, supabase)

  return (
    <NutritionistInviteClient
      token={token}
      invite={invite || null}
      error={error || null}
      user={user ? { id: user.id, email: user.email } : null}
    />
  )
}
