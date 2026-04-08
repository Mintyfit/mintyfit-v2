'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

const PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Try MintyFit risk-free',
    color: '#6b7280',
    highlight: false,
    features: [
      { text: '5 AI recipe generations / month', included: true },
      { text: 'Up to 2 family members', included: true },
      { text: 'Basic meal planner (7 days)', included: true },
      { text: 'Recipe library access', included: true },
      { text: 'Manual food journal', included: true },
      { text: 'Shopping list', included: false },
      { text: 'Nutrition statistics', included: false },
      { text: 'AI food photo recognition', included: false },
      { text: 'Nutritionist link', included: false },
      { text: 'Menu library', included: false },
    ],
    cta: 'Get Started Free',
    ctaHref: '/onboarding',
    stripePriceId: null,
  },
  {
    name: 'Pro',
    monthlyPrice: 4.99,
    annualPrice: 3.99,
    description: 'For health-conscious individuals',
    color: '#10b981',
    highlight: false,
    features: [
      { text: 'Unlimited AI recipe generations', included: true },
      { text: 'Up to 2 family members', included: true },
      { text: 'Full meal planner (unlimited)', included: true },
      { text: 'Recipe library access', included: true },
      { text: 'AI + barcode food journal', included: true },
      { text: 'Smart shopping list', included: true },
      { text: 'Full nutrition statistics', included: true },
      { text: 'AI food photo recognition', included: true },
      { text: 'Nutritionist link', included: false },
      { text: 'Menu library', included: false },
    ],
    cta: 'Start Pro',
    ctaHref: null,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID,
  },
  {
    name: 'Family',
    monthlyPrice: 7.99,
    annualPrice: 6.39,
    description: 'Built for the whole family',
    color: '#8b5cf6',
    highlight: true,
    features: [
      { text: 'Unlimited AI recipe generations', included: true },
      { text: 'Up to 8 family members', included: true },
      { text: 'Full meal planner (unlimited)', included: true },
      { text: 'Recipe library access', included: true },
      { text: 'AI + barcode food journal', included: true },
      { text: 'Smart shopping list', included: true },
      { text: 'Full nutrition statistics', included: true },
      { text: 'AI food photo recognition', included: true },
      { text: 'Nutritionist link', included: true },
      { text: 'Full menu library', included: true },
    ],
    cta: 'Start Family Plan',
    ctaHref: null,
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_FAMILY_MONTHLY_PRICE_ID,
    stripePriceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_FAMILY_ANNUAL_PRICE_ID,
  },
]

const FAQ = [
  { q: 'Can I switch plans?', a: 'Yes. Upgrade or downgrade anytime from Settings → Subscription. Prorated billing applies.' },
  { q: 'Is there a free trial?', a: 'MintyFit Free is free forever with no card required. Upgrade when you need more.' },
  { q: 'How do I cancel?', a: 'Cancel anytime in Settings → Subscription. You keep access until the end of your billing period.' },
  { q: 'What counts as a "family member"?', a: 'Any person you add to your account — partner, child, elderly parent. Managed members (kids without accounts) count too.' },
  { q: 'Is my health data secure?', a: 'Yes. All data is encrypted and stored in EU-region servers (Supabase, GDPR compliant). We never sell your data.' },
  { q: 'Can a nutritionist access my account?', a: 'On the Family plan, you can optionally link a certified nutritionist. They can view your data and leave notes — only if you invite them.' },
]

export default function PricingClient() {
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)
  const { user } = useAuth()

  async function startCheckout(plan, isAnnual) {
    if (!plan.stripePriceIdMonthly) return
    if (!user) { window.location.href = '/?auth=login&redirect=/pricing'; return }
    setLoading(plan.name)
    try {
      const priceId = isAnnual ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      alert('Checkout error: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  async function manageSubscription() {
    if (!user) return
    setLoading('manage')
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      alert('Portal error: ' + err.message)
    } finally {
      setLoading(null)
    }
  }

  const annualSavings = (pct) => `Save ${pct}%`

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary, #111827)' }}>
          Simple, Family-First Pricing
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary, #6b7280)', marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem' }}>
          One plan per family. Not per person. Start free — no credit card required.
        </p>

        {/* Toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'var(--card-bg, #f9fafb)', padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid var(--border-color, #e5e7eb)' }}>
          <span style={{ fontWeight: annual ? 400 : 600, color: annual ? 'var(--text-secondary, #6b7280)' : 'var(--text-primary, #111827)' }}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            style={{ width: 44, height: 24, borderRadius: '999px', background: annual ? '#10b981' : '#d1d5db', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
            <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: annual ? 22 : 2, transition: 'left 0.2s' }} />
          </button>
          <span style={{ fontWeight: annual ? 600 : 400, color: annual ? 'var(--text-primary, #111827)' : 'var(--text-secondary, #6b7280)' }}>
            Annual <span style={{ color: '#10b981', fontSize: '0.8rem' }}>({annualSavings(20)})</span>
          </span>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '4rem', alignItems: 'start' }}>
        {PLANS.map(plan => {
          const price = annual ? plan.annualPrice : plan.monthlyPrice
          const isHighlight = plan.highlight

          return (
            <div key={plan.name} style={{
              background: isHighlight ? `linear-gradient(135deg, #7c3aed, #8b5cf6)` : 'var(--card-bg, #fff)',
              borderRadius: '1rem', padding: '2rem', border: isHighlight ? 'none' : '1px solid var(--border-color, #e5e7eb)',
              position: 'relative', color: isHighlight ? '#fff' : 'inherit',
              boxShadow: isHighlight ? '0 8px 40px rgba(139,92,246,0.35)' : 'none',
              transform: isHighlight ? 'scale(1.03)' : 'none',
            }}>
              {isHighlight && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#92400e', padding: '0.25rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>{plan.name}</h2>
                <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>{plan.description}</p>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '2.75rem', fontWeight: 800 }}>
                  {price === 0 ? 'Free' : `$${price}`}
                </span>
                {price > 0 && <span style={{ opacity: 0.8 }}>/mo</span>}
                {annual && price > 0 && (
                  <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '0.25rem' }}>
                    Billed ${(price * 12).toFixed(0)}/year
                  </div>
                )}
              </div>

              <button
                onClick={() => plan.stripePriceIdMonthly ? startCheckout(plan, annual) : plan.ctaHref ? window.location.href = plan.ctaHref : null}
                disabled={loading === plan.name}
                style={{
                  width: '100%', padding: '0.875rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                  background: isHighlight ? '#fff' : plan.color, color: isHighlight ? '#7c3aed' : '#fff',
                  fontWeight: 700, fontSize: '1rem', marginBottom: '2rem', transition: 'opacity 0.2s',
                  opacity: loading === plan.name ? 0.6 : 1,
                }}>
                {loading === plan.name ? 'Loading…' : plan.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {plan.features.map(f => (
                  <li key={f.text} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', opacity: f.included ? 1 : 0.45 }}>
                    <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>{f.included ? '✓' : '✗'}</span>
                    <span style={{ fontSize: '0.9rem' }}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Manage subscription link */}
      {user && (
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <button onClick={manageSubscription} disabled={loading === 'manage'}
            style={{ padding: '0.75rem 2rem', background: 'transparent', border: '1.5px solid var(--border-color, #d1d5db)', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--text-primary, #374151)', fontWeight: 500 }}>
            {loading === 'manage' ? 'Loading…' : 'Manage Current Subscription →'}
          </button>
        </div>
      )}

      {/* Comparison callout */}
      <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '1rem', padding: '2rem', marginBottom: '4rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#065f46', marginBottom: '0.5rem' }}>
          💡 MintyFit Family vs. a family nutritionist
        </p>
        <p style={{ color: '#047857' }}>
          A nutritionist consultation costs €80–150/hour. MintyFit Family is €7.99/month for your entire family.
          That's AI-powered precision nutrition for less than a single coffee per week.
        </p>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, textAlign: 'center', marginBottom: '2rem', color: 'var(--text-primary, #111827)' }}>
          Frequently Asked Questions
        </h2>
        {FAQ.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary, #111827)' }}>{item.q}</span>
              <span style={{ color: '#10b981', fontSize: '1.25rem', flexShrink: 0 }}>{openFaq === i ? '−' : '+'}</span>
            </button>
            {openFaq === i && (
              <p style={{ margin: '0 0 0.75rem', color: 'var(--text-secondary, #6b7280)', lineHeight: 1.7 }}>{item.a}</p>
            )}
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary, #111827)' }}>
          Ready to feed your family smarter?
        </h3>
        <Link href="/onboarding"
          style={{ display: 'inline-block', padding: '1rem 2.5rem', background: '#10b981', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem' }}>
          Start Free — No Card Required
        </Link>
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary, #9ca3af)' }}>
          5 AI recipes free every month. Upgrade when you need more.
        </p>
      </div>
    </div>
  )
}
