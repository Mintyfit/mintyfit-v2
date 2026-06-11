import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sendEmail'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mintyfit.com'

// Connect client to nutritionist by email
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email } = await request.json()
    const searchEmail = email.toLowerCase().trim()
    console.log('[connect] STEP 1: Looking up nutritionist email:', searchEmail, 'client:', user.email)

    // Use admin client to bypass RLS for the profile lookup
    const adminClient = createAdminClient()
    const { data: nutritionistProfile } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', searchEmail)
      .single()

    console.log('[connect] STEP 2: Admin lookup — found:', !!nutritionistProfile, 'role:', nutritionistProfile?.role)

    if (!nutritionistProfile) {
      return NextResponse.json({
        error: 'No user found with that email',
        searched: searchEmail,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40),
      }, { status: 404 })
    }

    console.log('[connect] STEP 3: Found profile, role:', nutritionistProfile.role)
    if (nutritionistProfile.role !== 'nutritionist' && nutritionistProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'That user is not a registered nutritionist' }, { status: 400 })
    }

    // Create link (or re-activate if exists)
    console.log('[connect] STEP 4: Upserting link — client:', user.id, 'nutritionist:', nutritionistProfile.id)
    const { data: link, error } = await supabase
      .from('nutritionist_client_links')
      .upsert({
        nutritionist_id: nutritionistProfile.id,
        client_id: user.id,
        status: 'active',
      }, { onConflict: 'nutritionist_id,client_id' })
      .select()
      .single()

    if (error) {
      console.error('[connect] STEP 4 FAILED:', error)
      throw error
    }
    console.log('[connect] STEP 4: Link upserted, id:', link?.id)

    // Get client name for the email
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const clientName = clientProfile?.full_name || user.email?.split('@')[0] || 'A client'
    const nutritionistName = nutritionistProfile.full_name || 'Your nutritionist'

    // Send email notification to the nutritionist
    console.log('[connect] STEP 5: Sending email to:', nutritionistProfile.email)
    try {
      await sendEmail({
        to: nutritionistProfile.email,
        subject: `${clientName} has connected with you on MintyFit`,
        html: `<!doctype html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;">
    <h1 style="font-size:22px;font-weight:700;color:#1f2937;margin:0 0 12px;">New client connection</h1>
    <p style="font-size:15px;line-height:1.55;color:#1f2937;margin:0 0 24px;">
      <strong>${clientName}</strong> has connected with you on MintyFit. You can now view their meal plans, nutrition statistics, and leave professional notes.
    </p>
    <a href="${APP_URL}/nutritionist" style="display:inline-block;padding:12px 24px;background:#2d6e2e;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">View client dashboard</a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">MintyFit — family nutrition done right.</p>
  </div>
</body></html>`,
      })
      console.log('[connect] STEP 5: Email sent successfully')
    } catch (e) {
      console.error('[connect] STEP 5: Email notification failed:', e)
    }

    console.log('[connect] SUCCESS: Returning response')
    return NextResponse.json({ link, nutritionistName })
  } catch (err) {
    console.error('[connect] CAUGHT ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Disconnect nutritionist
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('nutritionist_client_links')
      .update({ status: 'inactive' })
      .eq('client_id', user.id)
      .eq('status', 'active')

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
