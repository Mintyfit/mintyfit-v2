'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const FACEBOOK_URL = 'https://www.facebook.com/MintyFitNutrition'
const YOUTUBE_URL  = 'https://www.youtube.com/@MintyFitNutrition'

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function YoutubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#1a1a1a" />
    </svg>
  )
}

export default function AppFooter() {
  const [pages, setPages] = useState([])

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase
      .from('pages')
      .select('title, slug')
      .eq('is_published', true)
      .order('title')
      .then(({ data }) => setPages(data || []))
  }, [])

  return (
    <footer style={{
      background: '#111827',
      color: 'rgba(255,255,255,0.65)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '48px 24px 36px',
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1fr',
        gap: 40,
      }}>
        {/* Column 1 — Brand */}
        <div>
          <Link href="/" style={{ display: 'inline-block', marginBottom: 16 }}>
            <img
              src="/images/MintyfitWhite.svg"
              alt="MintyFit"
              style={{ height: 36, width: 'auto' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </Link>
          <p style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 20, color: 'rgba(255,255,255,0.5)', maxWidth: 260 }}>
            Your personal nutrition companion — smart meal planning, family-friendly recipes, and AI-powered cooking.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 16 }}>
            <a
              href="mailto:info@mintyfit.com"
              style={{ color: '#6ee7b7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              info@mintyfit.com
            </a>
          </div>
        </div>

        {/* Column 2 — Quick Links */}
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            Quick Links
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Recipes',     href: '/recipes' },
              { label: 'Meal Planner', href: '/plan' },
              { label: 'Pricing',     href: '/pricing' },
              { label: 'Blog',        href: '/blog' },
            ].map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {pages.map(page => (
              <li key={page.slug}>
                <Link
                  href={`/pages/${page.slug}`}
                  style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Follow Us */}
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
            Follow Us
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                color: 'rgba(255,255,255,0.65)', textDecoration: 'none',
                fontSize: 16,
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FacebookIcon />
              </span>
              Facebook
            </a>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                color: 'rgba(255,255,255,0.65)', textDecoration: 'none',
                fontSize: 16,
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <YoutubeIcon />
              </span>
              YouTube
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 24px 80px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
        maxWidth: 1200, margin: '0 auto',
      }}>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>
          © {new Date().getFullYear()} MintyFit. All rights reserved.
        </span>
        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>
          Mintyfit.com is managed by <span style={{ color: 'rgba(255,255,255,0.55)' }}>Smart Diet OÜ</span>
        </span>
      </div>
    </footer>
  )
}
