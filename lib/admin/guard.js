import { createAdminClient } from '@/lib/supabase/server'

export async function requireAdmin(actorId) {
  if (!actorId) throw new Error('Unauthorized')
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', actorId)
    .single()
  if (profile?.role !== 'super_admin') throw new Error('Forbidden')
}
