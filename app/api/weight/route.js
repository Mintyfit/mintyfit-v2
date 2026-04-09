import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { weight, note } = await request.json()
    if (!weight || isNaN(weight)) return NextResponse.json({ error: 'Invalid weight' }, { status: 400 })

    const today = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('weight_logs')
      .upsert({
        profile_id: user.id,
        weight: parseFloat(weight),
        logged_date: today,
        note: note || null,
      }, { onConflict: 'profile_id,logged_date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ log: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('profile_id', user.id)
      .order('logged_date', { ascending: false })
      .limit(30)

    if (error) throw error
    return NextResponse.json({ logs: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
