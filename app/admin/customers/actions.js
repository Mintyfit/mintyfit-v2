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

export async function updateProfileField(formData) {
  const userId = formData.get('userId')
  const field = formData.get('field')
  const value = formData.get('value')
  const actorId = await getActorId()

  const allowed = ['role', 'subscription_tier', 'is_active', 'is_approved']
  if (!allowed.includes(field)) throw new Error('Field not allowed')

  const supabase = createAdminClient()
  const parsed = field === 'is_active' || field === 'is_approved' ? value === 'true' : value
  await supabase.from('profiles').update({ [field]: parsed }).eq('id', userId)

  await logAudit({ actorId, action: `admin.update.${field}`, targetId: userId, targetType: 'profile', details: { [field]: parsed } })
  revalidatePath('/admin/customers')
}

export async function toggleSuspend(formData) {
  const userId = formData.get('userId')
  const currentActive = formData.get('currentActive') === 'true'
  const actorId = await getActorId()

  const supabase = createAdminClient()
  await supabase.from('profiles').update({ is_active: !currentActive }).eq('id', userId)

  await logAudit({ actorId, action: currentActive ? 'admin.suspend' : 'admin.activate', targetId: userId, targetType: 'profile' })
  revalidatePath('/admin/customers')
}
