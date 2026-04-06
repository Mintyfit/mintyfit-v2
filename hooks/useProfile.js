import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

const supabase = createClient()

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) { console.log('profile fetch error:', error); console.error('fetchProfile error:', error); setError(error.message) }
    else setProfile(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    fetchProfile()
  }, [user?.id])

  const ALLOWED = ['full_name', 'avatar_url', 'units_preference', 'phone', 'nutritionist_email', 'nutritionist_sharing', 'email_weekly_summary', 'email_meal_reminders', 'email_tips']
  const updateProfile = async (updates) => {
    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ALLOWED.includes(k)))
    const { data, error } = await supabase
      .from('profiles')
      .update(safe)
      .eq('id', user.id)
      .select()
      .maybeSingle()
    if (!error) {
      setProfile(data)
      if (updates.full_name) {
        await supabase.from('family_members')
          .update({ name: updates.full_name })
          .eq('profile_id', user.id)
          .eq('is_primary', true)
      }
    }
    return { data, error }
  }

  return { profile, loading, error, updateProfile, refetch: fetchProfile }
}
