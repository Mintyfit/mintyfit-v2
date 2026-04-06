import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient()

export function useFamily() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('family_members')
      .select('*, measurements(*)')
      .eq('profile_id', user.id)
      .order('created_at')
    const list = data || []
    if (list.length === 0) {
      const { data: profileData } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      await supabase.from('family_members').insert({
        profile_id: user.id,
        name: profileData?.full_name || 'Me',
        gender: null,
        is_primary: true,
      })
      const { data: refetched } = await supabase
        .from('family_members')
        .select('*, measurements(*)')
        .eq('profile_id', user.id)
        .order('created_at')
      setMembers(refetched || [])
    } else {
      setMembers(list)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const addMember = async (memberData) => {
    const { data, error } = await supabase
      .from('family_members')
      .insert({ ...memberData, profile_id: user.id })
      .select()
      .single()
    if (error) console.error('addMember error:', error)
    else await fetchMembers()
    return { data, error }
  }

  const updateMember = async (id, updates) => {
    const { error } = await supabase
      .from('family_members')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) await fetchMembers()
    return { error }
  }

  const deleteMember = async (id) => {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', id)
    if (!error) await fetchMembers()
    return { error }
  }

  const addMeasurement = async (memberId, measurementData) => {
    const { error } = await supabase
      .from('measurements')
      .insert({ ...measurementData, family_member_id: memberId })
    if (!error) await fetchMembers()
    return { error }
  }

  const updateMeasurement = async (id, data) => {
    const { error } = await supabase
      .from('measurements')
      .update(data)
      .eq('id', id)
    if (!error) await fetchMembers()
    return { error }
  }

  return { members, loading, addMember, updateMember, deleteMember, addMeasurement, updateMeasurement, refetch: fetchMembers }
}
