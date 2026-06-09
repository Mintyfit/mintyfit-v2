'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import HeroCTA from './HeroCTA'
import FAQAccordion from './FAQAccordion'
import AuthModal from './AuthModal'
import CarouselSlider from './CarouselSlider'

const SECTIONS = [
  {
    eyebrow: 'The basics',
    heading: 'I want to eat nourishing and healthy food.',
    thoughts: [
      'I need instructions to make food like that.',
      'I want to eat enough. Not more. Not less.',
      'I want to know about all the nutrients - raw and cooked.',
      'I need to make enough for my whole family.',
      { text: 'And yes, I want to lose weight.', quiet: true },
    ],
    image: '/landing/Recipe.png',
    alt: 'MintyFit recipe screenshot',
  },
  {
    eyebrow: 'Recipes',
    heading: 'I do not want recipes that make me work.',
    thoughts: [
      'I want little steps.',
      'Only the ingredients that go with that step.',
      'I want to change ingredients and still know what happens.',
      'I want amounts to adapt to my family members\u2019 bodies.',
      'Sometimes guests come over.',
      { text: 'Sometimes only I eat.', quiet: true },
      'I want to add my own recipes.',
    ],
    image: '/landing/iInstructions.png',
    alt: 'MintyFit step-by-step instructions screenshot',
  },
  {
    eyebrow: 'Shopping and planning',
    heading: 'I want to know what I actually ate.',
    thoughts: [
      'I want to track what I\u2019ve eaten.',
      'I want to see every possible nutrition data point.',
      'I need a shopping list for one recipe.',
      'Or multiple recipes.',
      'I want to choose ingredients for shopping list.',
    ],
    image: '/landing/Macros.png',
    alt: 'MintyFit macro nutrient screenshot',
  },
  {
    eyebrow: 'Plan',
    heading: 'I want to plan meals.',
    thoughts: [
      'I want to choose how many meals I eat a day.',
      'I want a whole week meal plan sometimes.',
      { text: 'But not always.', quiet: true },
      { text: 'And I want to add my own foods when real life happens.', quiet: true },
    ],
    image: '/landing/Plan.png',
    alt: 'MintyFit daily meal tracking screenshot',
  },
  {
    eyebrow: 'Stats',
    heading: 'I want the system to notice patterns before I do.',
    thoughts: [
      'Based on my logs, I want to analyze my nutrient levels.',
      'I want exact suggestions.',
      'Not vague advice.',
      'Tell me what to change.',
      { text: 'Tell me how much. Tell me where.', quiet: true },
    ],
    image: '/landing/stats.png',
    alt: 'MintyFit nutrition stats screenshot',
  },
  {
    eyebrow: 'But I\u2019m a nutritionist',
    heading: 'I want to help clients with actual data.',
    thoughts: [
      'I want to see my clients\u2019 plan view.',
      'I want to make analyses based on their data.',
      'I want to understand what is really happening.',
      { text: 'Not guess from memory, screenshots and scattered notes.', quiet: true },
    ],
    image: '/landing/PerMember.png',
    alt: 'MintyFit per member nutrition screenshot',
  },
]

function Section({ section, idx, onOpenAuth }) {
  return (
    <section className="landing-section" style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 460px)',
      alignItems: 'center',
      gap: 'clamp(36px, 8vw, 120px)',
      padding: 'clamp(56px, 9vw, 120px) clamp(22px, 6vw, 96px)',
      borderBottom: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 'auto -15% -30% auto', width: 520, height: 520, background: 'radial-gradient(circle, rgba(159,207,127,0.22), transparent 64%)', pointerEvents: 'none', borderRadius: '50%' }} />
      <div style={{ maxWidth: 820, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 'clamp(14px, 1.4vw, 17px)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-1)', marginBottom: 28 }}>
          {section.eyebrow}
        </div>
        {idx === 0 ? (
          <h1 style={{ fontSize: 'clamp(40px, 6vw, 52px)', letterSpacing: '-0.07em', lineHeight: 0.92, fontWeight: 760, color: 'var(--text-1)', margin: 0, maxWidth: 940 }}>
            {section.heading}
          </h1>
        ) : (
          <h2 style={{ fontSize: 'clamp(38px, 5.6vw, 52px)', letterSpacing: '-0.07em', lineHeight: 0.92, fontWeight: 760, color: 'var(--text-1)', margin: 0, maxWidth: 900 }}>
            {section.heading}
          </h2>
        )}
        {idx === 0 && (
          <div style={{ marginTop: 'clamp(24px, 3vw, 40px)', display: 'flex', justifyContent: 'center' }}>
            <HeroCTA onOpenAuth={() => openAuth('signup')} />
          </div>
        )}
        <div style={{ marginTop: 'clamp(24px, 3vw, 40px)', display: 'grid', gap: 18, fontSize: 24, lineHeight: 1.13, letterSpacing: '-0.045em', maxWidth: 860 }}>
          {section.thoughts.map((t, i) => {
            const text = typeof t === 'string' ? t : t.text
            const quiet = typeof t === 'object' && t.quiet
            return (
              <p key={i} style={{ margin: 0, color: quiet ? 'var(--text-4)' : 'var(--text-2)' }}>{text}</p>
            )
          })}
        </div>
      </div>
      <div className="landing-phone-wrap" style={{ display: 'flex', justifyContent: 'center', position: 'sticky', top: 72, zIndex: 2 }}>
        <div className="landing-phone" style={{
          width: 'min(100%, 360px)',
          aspectRatio: '9 / 18.5',
          borderRadius: 42,
          background: '#10100e',
          padding: 13,
          boxShadow: '0 34px 90px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.08)',
          transform: idx === 0 ? 'rotate(2deg)' : 'none',
        }}>
          <div style={{ height: '100%', borderRadius: 32, overflow: 'hidden', background: '#f8fafc', position: 'relative' }}>
            <img src={section.image} alt={section.alt} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top center' }} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingClient() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('signup')
  const [blogPosts, setBlogPosts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [menus, setMenus] = useState([])
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    Promise.all([
      supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, image_url, published_at, created_at, content, blog_post_categories(blog_categories(id,name,slug,color))')
        .eq('is_published', true)
        .order('published_at', { ascending: false, nullsLast: true })
        .limit(12),
      supabase
        .from('recipes')
        .select('id, title, slug, image_url, nutrition, meal_type, prep_time_minutes, cook_time_minutes, description')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('menus')
        .select('id, name, slug, image_url, description, menu_recipes(count)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(12),
    ]).then(([blogResult, recipeResult, menuResult]) => {
      setBlogPosts(blogResult.data || [])
      setRecipes(recipeResult.data || [])
      setMenus(menuResult.data || [])
    })
  }, [])

  function openAuth(tab = 'signup') {
    setAuthTab(tab)
    setAuthOpen(true)
  }

  function handleAuthSuccess() {
    setAuthOpen(false)
    router.refresh()
  }

  return (
    <>
      <style>{`
        @media (max-width: 920px) {
          .landing-section {
            grid-template-columns: 1fr !important;
            min-height: auto !important;
            padding-block: 76px !important;
          }
          .landing-phone-wrap {
            position: relative !important;
            top: auto !important;
          }
          .landing-phone {
            width: min(82vw, 330px) !important;
            transform: rotate(0deg) !important;
          }
        }
        @media (max-height: 800px) {
          .landing-phone {
            width: min(60vw, 260px) !important;
          }
        }
        @media (max-height: 650px) {
          .landing-phone {
            width: min(50vw, 200px) !important;
          }
        }
      `}</style>
      <main>
        {SECTIONS.map((section, idx) => (
          <Section key={idx} section={section} idx={idx} onOpenAuth={openAuth} />
        ))}

        {/* CTA */}
        <section style={{
          minHeight: '88vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 'clamp(64px, 10vw, 140px) 22px',
          position: 'relative',
        }}>
          <div>
            <h2 style={{ fontSize: 'clamp(38px, 5.6vw, 52px)', letterSpacing: '-0.07em', lineHeight: 0.92, fontWeight: 760, color: 'var(--text-1)', margin: '0 auto', maxWidth: 900 }}>
              I want it to be free.
            </h2>
            <p style={{ margin: '36px auto 44px', maxWidth: 720, fontSize: 24, lineHeight: 1.12, letterSpacing: '-0.045em', color: 'var(--text-4)' }}>
              And I want it now.
            </p>
            <HeroCTA onOpenAuth={() => openAuth('signup')} />
          </div>
        </section>

        {/* Trust section */}
        <section style={{ padding: '5rem 1.25rem', background: 'var(--bg-page)' }}>
          <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
            <p style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Why trust us
            </p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.125rem)', fontWeight: 800, marginBottom: '2.5rem', color: 'var(--text-1)' }}>
              Built by a nutrition professional,<br />not a tech startup
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
              {[
                { icon: '🎓', text: 'MintyFit is built by a Precision Nutrition certified coach with a focus on metabolic health, insulin resistance, and evidence-based nutrition.' },
                { icon: '🔬', text: 'Every nutrient target is backed by peer-reviewed research and USDA FoodData Central.' },
                { icon: '🇪🇺', text: 'Operated by Smart Diet OÜ, Estonia. Your data stays in the EU and is never sold.' },
              ].map(({ icon, text }) => (
                <div key={icon} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', background: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
                  <p style={{ color: 'var(--text-2)', lineHeight: 1.65, fontSize: '0.9375rem', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQAccordion />

      </main>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        defaultTab={authTab}
      />
    </>
  )
}
