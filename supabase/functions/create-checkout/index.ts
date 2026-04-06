// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout session and returns the redirect URL.
// Required env vars:
//   STRIPE_SECRET_KEY          — Stripe secret key (set via supabase secrets set)
//   SUPABASE_URL               — auto-provided by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  — auto-provided by Supabase

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not set')

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

    // Authenticate the caller via JWT
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Unauthorized')

    const { priceId, planId, successUrl, cancelUrl } = await req.json()
    if (!priceId) throw new Error('priceId is required')

    const resolvedSuccessUrl = successUrl || `https://mintyfit.com/?upgraded=true`
    const resolvedCancelUrl  = cancelUrl  || `https://mintyfit.com/pricing`

    // Fetch or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .maybeSingle()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:  profile?.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: resolvedSuccessUrl,
      cancel_url:  resolvedCancelUrl,
      // metadata on the session — picked up by checkout.session.completed webhook
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId || '',
      },
      // also set on the subscription so subscription events carry the user id
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan_id: planId || '' },
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
