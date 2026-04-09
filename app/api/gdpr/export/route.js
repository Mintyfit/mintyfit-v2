import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    // Collect all user data in parallel
    const [
      profileResult,
      calendarResult,
      journalResult,
      weightResult,
      recipesResult,
      plansResult,
      notesResult,
      familyResult,
      managedResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('calendar_entries').select('*').eq('member_id', uid),
      supabase.from('journal_entries').select('*').eq('member_id', uid),
      supabase.from('weight_logs').select('*').eq('profile_id', uid).order('logged_date', { ascending: false }),
      supabase.from('recipes').select('id, name, meal_type, servings, created_at').eq('created_by', uid),
      supabase.from('meal_plans').select('*').eq('profile_id', uid),
      supabase.from('nutritionist_notes').select('id, content, created_at').eq('client_id', uid),
      supabase.from('family_memberships').select('family_id, role, status, created_at, families(name)').eq('profile_id', uid),
      supabase.from('managed_members').select('*').eq('managed_by', uid),
    ])

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: uid,
      email: user.email,
      profile: profileResult.data || {},
      calendar_entries: calendarResult.data || [],
      journal_entries: journalResult.data || [],
      weight_logs: weightResult.data || [],
      recipes_created: recipesResult.data || [],
      meal_plans: plansResult.data || [],
      nutritionist_notes_received: notesResult.data || [],
      family_memberships: familyResult.data || [],
      managed_members: managedResult.data || [],
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mintyfit-data-export-${uid.slice(0, 8)}.json"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
