import { createAdminClient } from '@/lib/supabase/server'

export async function logAudit({ actorId, action, targetId = null, targetType = null, details = null }) {
  const supabase = createAdminClient()
  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    target_id: targetId,
    target_type: targetType,
    details,
  })
}
