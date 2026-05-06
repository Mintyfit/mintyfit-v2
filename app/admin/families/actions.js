'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/admin/audit'

async function getActorId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export async function removeFamilyMember(formData) {
  const familyId = formData.get('familyId')
  const profileId = formData.get('profileId')
  const actorId = await getActorId()

  const supabase = createAdminClient()
  await supabase.from('family_memberships').delete().eq('family_id', familyId).eq('profile_id', profileId)

  await logAudit({ actorId, action: 'admin.family.remove_member', targetId: familyId, targetType: 'family', details: { profileId } })
  revalidatePath('/admin/families')
}

export async function updateMemberRole(formData) {
  const familyId = formData.get('familyId')
  const profileId = formData.get('profileId')
  const role = formData.get('role')
  const actorId = await getActorId()

  const supabase = createAdminClient()
  await supabase.from('family_memberships').update({ role }).eq('family_id', familyId).eq('profile_id', profileId)

  await logAudit({ actorId, action: 'admin.family.update_role', targetId: familyId, targetType: 'family', details: { profileId, role } })
  revalidatePath(`/admin/families/${familyId}`)
}
