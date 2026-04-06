import { createClient } from '@/lib/supabase/client'
import { memberColor } from '@/lib/member/memberColors'
import { computeBMR, SEDENTARY_MULTIPLIER } from '@/lib/nutrition/portionCalc'

const supabase = createClient()

export async function syncFamilyMembers(userId) {
  if (!userId) return []
  const { data } = await supabase
    .from('family_members')
    .select('*, measurements(*)')
    .eq('profile_id', userId)
    .order('created_at')
  return (data || []).map((m, i) => {
    const meas = (m.measurements || [])
      .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0]
    const age = m.date_of_birth
      ? Math.max(1, Math.floor((Date.now() - new Date(m.date_of_birth)) / (365.25 * 24 * 3600 * 1000)))
      : 30
    if (!meas?.weight_kg || !meas?.height_cm) {
      return {
        id: m.id, supabaseId: m.id,
        name: m.name, gender: m.gender || 'male', age,
        weight: null, height: null,
        bmr: null, baseDailyCalories: null,
        color: memberColor(i),
        activityProfiles: m.activity_profiles || [],
      }
    }
    const bmr = computeBMR(meas.weight_kg, meas.height_cm, age, m.gender || 'male')
    return {
      id: m.id, supabaseId: m.id,
      name: m.name, gender: m.gender || 'male', age,
      date_of_birth: m.date_of_birth || null,
      weight: meas.weight_kg, height: meas.height_cm,
      bmr, baseDailyCalories: bmr ? Math.round(bmr * SEDENTARY_MULTIPLIER) : null,
      color: memberColor(i),
      activityProfiles: m.activity_profiles || [],
    }
  })
}
