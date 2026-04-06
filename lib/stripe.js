'use client'

import { createClient } from '@/lib/supabase/client'

export const PLANS = [
  {
    id: 'pro-monthly',
    tier: 'pro',
    label: 'Pro Monthly',
    price: 4.99,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
    features: [
      '1 person',
      'Unlimited AI recipes',
      'Statistics & trends',
      'Activity tracking',
      'Advanced shopping list',
      'Priority support',
    ],
  },
  {
    id: 'pro-yearly',
    tier: 'pro',
    label: 'Pro Yearly',
    price: 39.99,
    interval: 'year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID || '',
    badge: 'Save 33%',
    popular: true,
    features: [
      '1 person',
      'Unlimited AI recipes',
      'Statistics & trends',
      'Activity tracking',
      'Advanced shopping list',
      'Priority support',
    ],
  },
  {
    id: 'family-monthly',
    tier: 'family',
    label: 'Family Monthly',
    price: 7.99,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID || '',
    features: [
      'Up to 6 linked accounts + unlimited managed kids',
      'Everything in Pro',
      'Shared meal planning',
      'Family dashboard',
      'Shopping list sharing',
      'Nutritionist link',
    ],
  },
  {
    id: 'family-yearly',
    tier: 'family',
    label: 'Family Yearly',
    price: 59.99,
    interval: 'year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_YEARLY_PRICE_ID || '',
    badge: 'Best Value',
    features: [
      'Up to 6 linked accounts + unlimited managed kids',
      'Everything in Pro',
      'Shared meal planning',
      'Family dashboard',
      'Shopping list sharing',
      'Nutritionist link',
    ],
  },
]

export const FREE_LIMITS = {
  membersPerFamily: 2,
  recipesPerDay: 5,
}

export function getBillingLabel(plan) {
  if (plan.interval === 'month') return `$${plan.price.toFixed(2)}/month`
  const monthly = (plan.price / 12).toFixed(2)
  return `$${plan.price.toFixed(2)}/year ($${monthly}/mo)`
}

export async function handleCheckout(plan) {
  const supabase = createClient()
  if (!supabase) throw new Error('Supabase not configured.')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Please sign in to upgrade.')

  const successUrl = `${window.location.origin}/?upgraded=true`
  const cancelUrl  = `${window.location.origin}/pricing`

  const res = await supabase.functions.invoke('create-checkout', {
    body: {
      priceId:    plan.priceId,
      planId:     plan.id,
      userId:     session.user.id,
      email:      session.user.email,
      successUrl,
      cancelUrl,
    },
  })

  if (res.error) throw new Error(res.error.message)
  if (res.data?.url) window.location.href = res.data.url
  else throw new Error('No checkout URL returned.')
}
