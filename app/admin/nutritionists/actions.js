'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/admin/audit'
import { sendEmail } from '@/lib/email/sendEmail'
import { nutritionistApprovedEmail } from '@/lib/email/templates'

async function getActorId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export async function approveNutritionist(formData) {
  const userId = formData.get('userId')
  const actorId = await getActorId()

  const supabase = createAdminClient()
  
  // Get user's info before updating
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, name, email')
    .eq('id', userId)
    .single()

  // Update profile
  await supabase.from('profiles').update({ role: 'nutritionist', is_approved: true, subscription_tier: 'nutritionist' }).eq('id', userId)

  // Send approval email
  const name = profile?.display_name || profile?.name || profile?.email || 'there'
  try {
    await sendEmail({
      to: profile?.email || userId,
      subject: 'You\'re approved as a MintyFit nutritionist',
      html: nutritionistApprovedEmail({ name }),
    })
  } catch (e) {
    console.error('Approval email failed:', e)
  }

  await logAudit({ actorId, action: 'admin.nutritionist.approve', targetId: userId, targetType: 'profile' })
  revalidatePath('/admin/nutritionists')
}

export async function revokeNutritionist(formData) {
  const userId = formData.get('userId')
  const actorId = await getActorId()

  const supabase = createAdminClient()
  await supabase.from('profiles').update({ role: 'customer', is_approved: false }).eq('id', userId)

  await logAudit({ actorId, action: 'admin.nutritionist.revoke', targetId: userId, targetType: 'profile' })
  revalidatePath('/admin/nutritionists')
}

export async function updateNutritionistTier(formData) {
  const userId = formData.get('userId')
  const tier = formData.get('tier')
  const actorId = await getActorId()

  const supabase = createAdminClient()
  await supabase.from('profiles').update({ subscription_tier: tier }).eq('id', userId)

  await logAudit({ actorId, action: 'admin.nutritionist.update_tier', targetId: userId, targetType: 'profile', details: { tier } })
  revalidatePath('/admin/nutritionists')
}
