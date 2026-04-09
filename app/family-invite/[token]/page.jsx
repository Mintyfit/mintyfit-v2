import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FamilyInviteClient from '@/components/family/FamilyInviteClient'

export const metadata = {
  title: 'Family Invite — MintyFit',
  description: 'Join a family on MintyFit.',
}

async function getInviteData(token, supabase) {
  try {
    const { data: invite } = await supabase
      .from('family_invites')
      .select('id, family_id, email, status, expires_at, families(id, name)')
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

export default async function FamilyInvitePage({ params }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { invite, error } = await getInviteData(token, supabase)

  // If user is logged in and invite is valid, auto-join check
  let alreadyInFamily = false
  if (user && invite) {
    const { data: existing } = await supabase
      .from('family_memberships')
      .select('id')
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
    alreadyInFamily = !!existing
  }

  return (
    <FamilyInviteClient
      token={token}
      invite={invite || null}
      error={error || null}
      user={user ? { id: user.id, email: user.email } : null}
      alreadyInFamily={alreadyInFamily}
    />
  )
}
