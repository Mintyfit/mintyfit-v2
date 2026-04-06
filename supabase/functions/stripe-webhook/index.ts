// Supabase Edge Function: stripe-webhook
// Handles incoming Stripe webhook events and keeps profiles in sync.
// Required env vars:
//   STRIPE_SECRET_KEY         — Stripe secret key
//   STRIPE_WEBHOOK_SECRET     — whsec_... from Stripe Dashboard → Webhooks
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided by Supabase)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId  = session.metadata?.supabase_user_id

        if (userId && session.subscription) {
          // Retrieve full subscription to record period end
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await upsertSubscription(supabase, userId, sub, 'paid')
          // Activate the user
          await supabase.from('profiles')
            .update({ subscription_tier: 'paid', status: 'active' })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
          || await getUserIdByCustomer(supabase, sub.customer as string)

        if (userId) {
          const isActive = sub.status === 'active'
          const tier     = isActive ? 'paid' : 'free'
          await upsertSubscription(supabase, userId, sub, tier)
          await supabase.from('profiles')
            .update({
              subscription_tier: tier,
              status: isActive ? 'active' : 'inactive',
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
          || await getUserIdByCustomer(supabase, sub.customer as string)

        if (userId) {
          await supabase.from('subscriptions')
            .update({ status: sub.status, tier: 'free', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', sub.id)
          await supabase.from('profiles')
            .update({ subscription_tier: 'free', status: 'active' })
            .eq('id', userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const userId     = await getUserIdByCustomer(supabase, customerId)

        if (userId) {
          await supabase.from('profiles')
            .update({ status: 'past_due' })
            .eq('id', userId)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})

async function getUserIdByCustomer(supabase: any, customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id || null
}

async function upsertSubscription(supabase: any, userId: string, sub: Stripe.Subscription, tier: string) {
  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null

  await supabase.from('subscriptions').upsert({
    user_id:               userId,
    stripe_customer_id:    sub.customer as string,
    stripe_subscription_id: sub.id,
    status:                sub.status,
    tier,
    current_period_end:    periodEnd,
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })
}
