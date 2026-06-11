import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { members, dietary, goals, units } = await request.json()

    if (!members?.length) {
      return NextResponse.json({ error: 'At least one family member required' }, { status: 400 })
    }

    const primary = members[0]
    const others = members.slice(1)

    // Extract dietary data for primary member
    const primaryDietary = dietary?.[primary.id] || []
    const primaryDietaryType = primaryDietary.length > 0 ? primaryDietary[0] : null
    const primaryAllergies = primaryDietary.length > 1 ? primaryDietary.slice(1) : []

    // 1. Update user's profile with their own data
    const profileUpdates = {
      full_name: primary.name || user.email?.split('@')[0],
      date_of_birth: primary.dob || null,
      gender: primary.gender || null,
      weight: primary.weight ? parseFloat(primary.weight) : null,
      height: primary.height ? parseFloat(primary.height) : null,
      dietary_type: primaryDietaryType,
      allergies: primaryAllergies,
      primary_goal: goals?.[primary.id] || null,
      units_preference: units || 'metric',
      onboarding_pending: false,
    }
    // Preserve existing full_name if user hasn't set one in onboarding
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    if (existingProfile?.full_name && !primary.name) {
      delete profileUpdates.full_name
    }

    await admin.from('profiles').update(profileUpdates).eq('id', user.id)

    // 1b. Create initial weight log entry so it shows up in My Account
    if (primary.weight) {
      await admin.from('weight_logs').insert({
        profile_id: user.id,
        weight: parseFloat(primary.weight),
        logged_date: new Date().toISOString().slice(0, 10),
        note: 'Initial measurement',
      }).maybeSingle()
    }

    // 2. Check if user already has a family
    const { data: existingMembership } = await admin
      .from('family_memberships')
      .select('family_id')
      .eq('profile_id', user.id)
      .maybeSingle()

    let familyId = existingMembership?.family_id

    if (!familyId) {
      // Create a new family
      const { data: family, error: familyError } = await admin
        .from('families')
        .insert({ name: 'My Family', created_by: user.id })
        .select('id')
        .single()

      if (familyError || !family) {
        return NextResponse.json({ error: 'Failed to create family' }, { status: 500 })
      }
      familyId = family.id

      // Create membership
      await admin.from('family_memberships').insert({
        family_id: familyId,
        profile_id: user.id,
        role: 'admin',
      })
    }

    // 3. Create managed_members for additional family members
    for (const member of others) {
      if (!member.name?.trim()) continue
      const weight = member.weight ? parseFloat(member.weight) : null
      const height = member.height ? parseFloat(member.height) : null
      await admin.from('managed_members').insert({
        family_id: familyId,
        managed_by: user.id,
        name: member.name.trim(),
        date_of_birth: member.dob || null,
        gender: member.gender || null,
        weight,
        height,
        goals: goals?.[member.id] ? [goals[member.id]] : [],
      })
    }

    return NextResponse.json({ success: true, familyId })
  } catch (err) {
    console.error('[onboarding-complete] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
