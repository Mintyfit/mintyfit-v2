'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'How does family meal planning work?',
    a: 'You add each family member with their age, weight, and goals. MintyFit calculates personalized calorie and nutrient targets for each person. When you add a recipe to the planner, every member gets their own portion automatically calculated by body weight. One dinner — perfect portions for everyone.',
  },
  {
    q: 'What dietary restrictions can MintyFit handle?',
    a: 'MintyFit supports vegetarian, vegan, gluten-free, dairy-free, nut allergy, keto, paleo, and pescatarian diets. Each family member can have different restrictions, and the AI recipe generator respects all of them when creating or suggesting meals.',
  },
  {
    q: 'How does the AI recipe generation work?',
    a: 'Describe what you want to eat — by text or voice — and MintyFit generates a complete recipe in seconds. You get a food photo, full ingredient list with quantities, step-by-step cooking instructions, and a 47-nutrient breakdown using USDA FoodData Central. The AI uses Claude (Anthropic) under the hood.',
  },
  {
    q: 'How is MintyFit different from MyFitnessPal?',
    a: 'MyFitnessPal is a food logging app for individuals. MintyFit is a meal planning platform built for families. It generates complete recipes, plans your week, calculates per-person portions based on each body\'s actual metabolic needs, and gives you a shopping list. It\'s proactive, not reactive.',
  },
  {
    q: 'Is my family\'s health data secure?',
    a: 'Yes. MintyFit is operated by Smart Diet OÜ, an Estonian company. All data is stored in EU-based servers and never sold to third parties. We comply with GDPR. Your family\'s health data belongs to you.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no lock-in. Cancel from your account settings at any time. If you cancel, you keep access until the end of your billing period. Your data is preserved — you can re-subscribe without losing anything.',
  },
]

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" style={{ padding: '5rem 1.25rem', background: 'var(--bg-card)' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <p style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          FAQ
        </p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, marginBottom: '3rem', color: 'var(--text-1)' }}>
          Common questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '1.25rem 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: '1rem',
                }}
              >
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>
                  {faq.q}
                </span>
                <span style={{
                  flexShrink: 0, color: 'var(--primary)',
                  transform: openIndex === i ? 'rotate(45deg)' : 'none',
                  transition: 'transform 0.2s',
                  fontSize: '1.5rem', lineHeight: 1,
                }}>
                  +
                </span>
              </button>
              {openIndex === i && (
                <p style={{
                  margin: '0 0 1.25rem 0',
                  color: 'var(--text-2)', lineHeight: 1.7, fontSize: '0.9375rem',
                }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
