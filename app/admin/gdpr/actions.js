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

export async function resolveGdprRequest(formData) {
  const requestId = formData.get('requestId')
  const decision = formData.get('decision') // 'approved' | 'denied'
  const actorId = await getActorId()

  const supabase = createAdminClient()
  await supabase.from('gdpr_requests').update({ status: decision, resolved_by: actorId, resolved_at: new Date().toISOString() }).eq('id', requestId)

  await logAudit({ actorId, action: `admin.gdpr.${decision}`, targetId: requestId, targetType: 'gdpr_request' })
  revalidatePath('/admin/gdpr')
}
