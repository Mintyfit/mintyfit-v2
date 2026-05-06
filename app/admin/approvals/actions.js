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

export async function setPublic(formData) {
  const id = formData.get('id')
  const table = formData.get('table') // 'recipes' | 'menus'
  const approve = formData.get('approve') === 'true'
  const actorId = await getActorId()

  const allowed = ['recipes', 'menus']
  if (!allowed.includes(table)) throw new Error('Invalid table')

  const supabase = createAdminClient()
  await supabase.from(table).update({ is_public: approve }).eq('id', id)

  await logAudit({ actorId, action: `admin.${approve ? 'approve' : 'reject'}.${table}`, targetId: id, targetType: table })
  revalidatePath('/admin/approvals')
}
