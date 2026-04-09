'use client'

import { useState } from 'react'
import Link from 'next/link'

const FREE_FEATURES = [
  'Up to 2 family members',
  '5 AI recipes per day',
  'Full meal planner',
  'All 47 nutrients visible',
  'Food journal',
  'Basic shopping list',
]

const PRO_FEATURES = [
  '1 person',
  'Unlimited AI recipes',
  'Statistics & trends',
  'Activity tracking with nutrition adjustment',
  'Advanced shopping list (sharing, aggregation)',
  'Priority support',
]

const FAMILY_FEATURES = [
  'Up to 6 family accounts + unlimited kids',
  'Everything in Pro for every member',
  'Shared meal planning',
  'Family nutrition dashboard',
  'Shared shopping list',
  'Nutritionist connection',
]

export default function PricingToggle({ onOpenAuth }) {
  const [yearly, setYearly] = useState(true)

  const proPrice = yearly ? '$39.99/yr' : '$4.99/mo'
  const proSub = yearly ? '($3.33/mo — save 33%)' : null
  const familyPrice = yearly ? '$59.99/yr' : '$7.99/mo'
  const familySub = yearly ? '($5.00/mo — save 38%)' : null

  return (
    <section id="pricing" style={{ padding: '5rem 1.25rem', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <p style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Pricing
        </p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-1)' }}>
          Simple, honest pricing
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-3)', marginBottom: '2.5rem', fontSize: '1.0625rem' }}>
          Start free. Upgrade when you're ready.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.9375rem', color: yearly ? 'var(--text-3)' : 'var(--text-1)', fontWeight: yearly ? 400 : 600 }}>Monthly</span>
          <button
            onClick={() => setYearly(v => !v)}
            aria-pressed={yearly}
            style={{
              width: '52px', height: '28px', borderRadius: '14px',
              background: yearly ? 'var(--primary)' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: yearly ? '27px' : '3px',
              width: '22px', height: '22px',
              borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '0.9375rem', color: yearly ? 'var(--text-1)' : 'var(--text-3)', fontWeight: yearly ? 600 : 400 }}>
            Yearly
            {yearly && <span style={{ marginLeft: '0.5rem', background: '#dcfce7', color: '#15803d', padding: '0.125rem 0.5rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Save up to 38%</span>}
          </span>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}>
          {/* Free */}
          <PricingCard
            tier="Free"
            price="$0"
            description="Genuinely useful, not crippled."
            features={FREE_FEATURES}
            cta="Get started free"
            onCTA={onOpenAuth}
            highlighted={false}
          />

          {/* Pro */}
          <PricingCard
            tier="Pro"
            price={proPrice}
            subPrice={proSub}
            description="For individuals serious about nutrition."
            features={PRO_FEATURES}
            cta="Start Pro"
            onCTA={onOpenAuth}
            highlighted={false}
          />

          {/* Family */}
          <PricingCard
            tier="Family"
            price={familyPrice}
            subPrice={familySub}
            description="Whole family, one plan."
            features={FAMILY_FEATURES}
            cta="Start Family plan"
            onCTA={onOpenAuth}
            highlighted={true}
            badge="Most popular"
          />
        </div>

        {/* Comparison note */}
        <p style={{
          textAlign: 'center', marginTop: '2.5rem',
          color: 'var(--text-3)', fontSize: '0.9375rem',
        }}>
          A family of 4 on MyFitnessPal: <strong style={{ color: 'var(--text-2)' }}>$400/year</strong>.{' '}
          MintyFit Family: <strong style={{ color: 'var(--primary)' }}>$60/year</strong>.
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <Link href="/pricing" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9375rem' }}>
            See full pricing details →
          </Link>
        </p>
      </div>
    </section>
  )
}

function PricingCard({ tier, price, subPrice, description, features, cta, onCTA, highlighted, badge }) {
  return (
    <div style={{
      background: highlighted ? 'var(--primary)' : 'var(--bg-card)',
      color: highlighted ? '#fff' : 'var(--text-1)',
      borderRadius: '16px',
      padding: '2rem',
      border: highlighted ? 'none' : '1px solid var(--border)',
      boxShadow: highlighted ? '0 8px 32px rgba(61,138,62,0.35)' : 'none',
      position: 'relative',
      transform: highlighted ? 'scale(1.03)' : 'none',
    }}>
      {badge && (
        <span style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
          background: '#fef08a', color: '#713f12', padding: '0.25rem 0.875rem',
          borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {badge}
        </span>
      )}

      <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: '0.5rem' }}>
        {tier}
      </div>

      <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>{price}</div>
      {subPrice && <div style={{ fontSize: '0.8125rem', opacity: 0.75, marginBottom: '0.5rem' }}>{subPrice}</div>}
      <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1.5rem' }}>{description}</p>

      <button
        onClick={onCTA}
        style={{
          width: '100%', padding: '0.875rem', borderRadius: '10px',
          background: highlighted ? '#fff' : 'var(--primary)',
          color: highlighted ? 'var(--primary)' : '#fff',
          border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9375rem',
          marginBottom: '1.5rem',
        }}
      >
        {cta}
      </button>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ marginTop: '1px', opacity: 0.9, flexShrink: 0 }}>✓</span>
            <span style={{ opacity: 0.9 }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
