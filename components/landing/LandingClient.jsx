'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import HeroCTA from './HeroCTA'
import FAQAccordion from './FAQAccordion'
import AuthModal from './AuthModal'
import CarouselSlider from './CarouselSlider'

// --- Section data ---

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Tell us about your family',
    desc: 'Add each person — age, weight, goals, dietary needs. MintyFit calculates exactly what everyone needs.',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    step: '02',
    title: 'Generate recipes with AI',
    desc: 'Describe what you want to eat. MintyFit creates a complete recipe with a photo and 47-nutrient breakdown in seconds.',
    icon: '✨',
  },
  {
    step: '03',
    title: 'Plan your week, shop, and cook',
    desc: 'Drag recipes onto your weekly planner. Each person gets their portions. A shopping list generates automatically.',
    icon: '📅',
  },
]

const FEATURES = [
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Stop cooking two separate dinners',
    desc: 'Every family member has different calorie needs, allergies, and preferences. MintyFit calculates personalized portions so one recipe works for everyone at the table.',
    color: '#f0fdf4',
    darkColor: '#1a2e1a',
  },
  {
    icon: '✨',
    title: 'Dinner idea to full recipe in 30 seconds',
    desc: 'Describe what you want — by text or voice. Our AI generates a complete recipe with photo, ingredients, steps, and 47-nutrient breakdown instantly.',
    color: '#faf5ff',
    darkColor: '#1e1a2e',
  },
  {
    icon: '📊',
    title: 'Know exactly what your family is missing',
    desc: 'Go beyond calories. MintyFit flags nutrient gaps and recommends recipes to fill them. Based on USDA data and metabolic health research.',
    color: '#eff6ff',
    darkColor: '#1a1e2e',
  },
  {
    icon: '✅',
    title: 'Sunday planning. Done in 10 minutes.',
    desc: 'Plan the whole week for the whole family. Drag, drop, done. Shopping list generates automatically. Share it with your partner.',
    color: '#fff7ed',
    darkColor: '#2e1e0e',
  },
]

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
      <main>
        {/* ===== 1. HERO ===== */}
        <section style={{
          padding: 'clamp(3rem, 8vw, 6rem) 1.25rem',
          background: 'var(--bg-page)',
          overflow: 'hidden',
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
          }}>
            {/* Left: text */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#f0fdf4', color: '#166534', padding: '0.375rem 0.875rem',
                borderRadius: '20px', fontSize: '0.8125rem', fontWeight: 600,
                marginBottom: '1.5rem',
              }}>
                🌿 Family nutrition, finally solved
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: 'var(--text-1)',
                marginBottom: '1.25rem',
              }}>
                Your family eats differently.
                <br />
                <span style={{ color: 'var(--primary)' }}>Now they can eat right.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(1rem, 2vw, 1.1875rem)',
                color: 'var(--text-2)',
                lineHeight: 1.7,
                marginBottom: '2.25rem',
                maxWidth: '520px',
              }}>
                MintyFit plans every meal around each person's body — their age, weight, goals, and allergies.
                One plan. Everyone covered. Generated by AI in seconds.
              </p>

              <HeroCTA onOpenAuth={() => openAuth('signup')} />

              <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                {['No credit card required', 'Free plan available', 'GDPR compliant'].map(t => (
                  <span key={t} style={{ fontSize: '0.8125rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ color: 'var(--primary)' }}>✓</span> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: hero image */}
            <div style={{
              position: 'relative', borderRadius: '20px', overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
              aspectRatio: '4/3',
              background: '#e5f5e8',
            }}>
              <Image
                src="/MintyHero.webp"
                alt="Family cooking a healthy meal together in a bright modern kitchen"
                fill
                style={{ objectFit: 'cover' }}
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        {/* ===== 2. HOW IT WORKS ===== */}
        <section id="how-it-works" style={{ padding: '5rem 1.25rem', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              How it works
            </p>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, marginBottom: '3.5rem', color: 'var(--text-1)' }}>
              How MintyFit works
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '2rem',
            }}>
              {HOW_IT_WORKS.map(({ step, title, desc, icon }) => (
                <div key={step} style={{
                  background: 'var(--bg-page)',
                  borderRadius: '16px',
                  padding: '2rem',
                  border: '1px solid var(--border)',
                  position: 'relative',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: '#f0fdf4', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem',
                  }}>
                    {icon}
                  </div>
                  <div style={{
                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                    fontSize: '2rem', fontWeight: 900, color: 'var(--border)',
                    lineHeight: 1,
                  }}>
                    {step}
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-1)' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-3)', lineHeight: 1.65 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 3. FEATURES ===== */}
        <section id="features" style={{ padding: '5rem 1.25rem', background: 'var(--bg-page)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Features
            </p>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800, marginBottom: '3.5rem', color: 'var(--text-1)' }}>
              What makes MintyFit different
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}>
              {FEATURES.map(({ icon, title, desc, color }) => (
                <div key={title} style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem',
                  }}>
                    {icon}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.625rem', color: 'var(--text-1)', lineHeight: 1.4 }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', lineHeight: 1.65 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 4. RECIPE SLIDER ===== */}
        <CarouselSlider
          title="Try These Recipes"
          subtitle="Popular family meals — every recipe has full nutrition breakdown"
          linkHref="/recipes"
          linkLabel="Browse all recipes →"
          items={recipes}
          renderCard={recipe => (
            <Link href={`/recipes/${recipe.slug || recipe.id}`} style={{ textDecoration: 'none', display: 'flex', width: '100%' }}>
              <article style={{
                background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden',
                border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', width: '100%',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ height: 160, background: '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
                  {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.title} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2.5rem' }}>🍽️</div>
                  )}
                  {recipe.meal_type && (
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8,
                      background: 'rgba(255,255,255,0.9)', color: 'var(--primary)',
                      padding: '2px 8px', borderRadius: 20, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'capitalize',
                    }}>
                      {recipe.meal_type.replace('snack2', 'snack')}
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 6,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {recipe.title}
                  </h3>
                  {recipe.description && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.4, marginBottom: 'auto',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {recipe.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 10, fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {recipe.nutrition?.perServing?.energy_kcal != null && (
                      <span>🔥 {Math.round(recipe.nutrition.perServing.energy_kcal)} kcal</span>
                    )}
                    {((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)) > 0 && (
                      <span>⏱ {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min</span>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          )}
        />

        {/* ===== 5. MENU SLIDER ===== */}
        <CarouselSlider
          title="Browse Meal Plans"
          subtitle="Curated family menus — apply one to your planner in one click"
          linkHref="/menus"
          linkLabel="Browse all menus →"
          items={menus}
          renderCard={menu => {
            const count = menu.menu_recipes?.[0]?.count || 0
            return (
              <Link href={`/menus/${menu.slug || menu.id}`} style={{ textDecoration: 'none', display: 'flex', width: '100%' }}>
                <article style={{
                  background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', width: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ height: 160, background: '#f3f4f6', overflow: 'hidden' }}>
                    {menu.image_url ? (
                      <img src={menu.image_url} alt={menu.name} loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2.5rem' }}>🥗</div>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 6,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {menu.name}
                    </h3>
                    {menu.description && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.4, marginBottom: 'auto',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {menu.description}
                      </p>
                    )}
                    {count > 0 && (
                      <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        {count} recipe{count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            )
          }}
        />

        {/* ===== 6. BLOG SLIDER ===== */}
        <CarouselSlider
          title="From the MintyFit Blog"
          subtitle="Tips, research, and inspiration for healthier family meals"
          linkHref="/blog"
          linkLabel="View all blog posts →"
          items={blogPosts}
          renderCard={post => {
            const category = post.blog_post_categories?.[0]?.blog_categories
            const words = (post.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
            const mins = Math.max(1, Math.ceil(words / 200))
            const dateStr = post.published_at || post.created_at
            const date = dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
            return (
              <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'flex', width: '100%' }}>
                <article style={{
                  background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', width: '100%',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ height: 160, background: '#f3f4f6', overflow: 'hidden' }}>
                    {post.image_url ? (
                      <img src={post.image_url} alt={post.title} loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2.5rem' }}>📝</div>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {category && (
                      <span style={{
                        display: 'inline-block', alignSelf: 'flex-start',
                        background: '#f0fdf4', color: 'var(--primary)',
                        fontSize: '0.6875rem', fontWeight: 700,
                        padding: '2px 8px', borderRadius: 100, marginBottom: 8,
                      }}>
                        {category.name}
                      </span>
                    )}
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3, marginBottom: 6,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', lineHeight: 1.4, marginBottom: 'auto',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {post.excerpt}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      <span>{date}</span>
                      <span>{mins} min read</span>
                    </div>
                  </div>
                </article>
              </Link>
            )
          }}
        />

        {/* ===== 7. TRUST ===== */}
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
                {
                  icon: '🎓',
                  text: 'MintyFit is built by a Precision Nutrition certified coach with a focus on metabolic health, insulin resistance, and evidence-based nutrition.',
                },
                {
                  icon: '🔬',
                  text: 'Every nutrient target is backed by peer-reviewed research and USDA FoodData Central — not crowd-sourced databases with 20 million unverified entries.',
                },
                {
                  icon: '🇪🇺',
                  text: 'Operated by Smart Diet OÜ, Estonia. Your data stays in the EU and is never sold.',
                },
              ].map(({ icon, text }) => (
                <div key={icon} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '1rem',
                  background: 'var(--bg-card)', padding: '1.25rem 1.5rem',
                  borderRadius: '12px', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
                  <p style={{ color: 'var(--text-2)', lineHeight: 1.65, fontSize: '0.9375rem', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 8. FAQ ===== */}
        <FAQAccordion />

        {/* ===== 9. FINAL CTA ===== */}
        <section style={{
          padding: '5rem 1.25rem',
          background: 'linear-gradient(135deg, var(--primary) 0%, #2d6b2e 100%)',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', lineHeight: 1.2 }}>
              Ready to feed your family better?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.125rem', marginBottom: '2.5rem' }}>
              Start with a free plan. No credit card required.
            </p>
            <a href="/onboarding" style={{
              display: 'inline-block',
              background: '#fff',
              color: 'var(--primary)',
              padding: '1.125rem 2.5rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1.0625rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}>
              Plan Your Family's First Week — Free →
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          padding: '2rem 1.25rem',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          color: 'var(--text-4)',
          fontSize: '0.8125rem',
        }}>
          <p>© {new Date().getFullYear()} Smart Diet OÜ · Estonia ·{' '}
            <a href="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Privacy</a>
            {' · '}
            <a href="/terms" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Terms</a>
          </p>
        </footer>
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
