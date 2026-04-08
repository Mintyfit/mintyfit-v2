import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  try {
    const { userId } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No Stripe customer found' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'https://mintyfit.com'
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/my-account`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
