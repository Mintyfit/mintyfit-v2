'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import BlogCalculatorEmbed from '@/components/calculators/BlogCalculatorEmbed'
import { getCalculatorBySlug } from '@/components/calculators'

// Markers placed by content authors: <!-- CALCULATOR:slug --> or <div data-calculator="slug"></div>
const CALCULATOR_PATTERN = /<!--\s*CALCULATOR:\s*([a-z0-9-]+)\s*-->|<div\s+data-calculator\s*=\s*["']([a-z0-9-]+)["']\s*><\/div>/gi

// Legacy iframes embed static HTML calculators hosted at mintyfit.com/calculators/<file>.html .
// Map the filename stem to a calculator slug in the React registry so we can render the live component instead.
const LEGACY_IFRAME_MAP = [
  { pattern: /water-intake-calculator/i, slug: 'water-calculator' },
  { pattern: /vitamin-d3?-calculator/i,  slug: 'vitamin-d3-calculator' },
]

function resolveLegacyIframeSlug(src) {
  if (!src) return null
  for (const { pattern, slug } of LEGACY_IFRAME_MAP) {
    if (pattern.test(src) && getCalculatorBySlug(slug)) return slug
  }
  return null
}

export default function BlogContent({ html }) {
  const ref = useRef(null)
  const mountedRootsRef = useRef([])

  // Extract calculator slugs from author-placed markers (rendered after content)
  const calculatorSlugs = useMemo(() => {
    if (!html) return []
    const slugs = []
    let match
    const re = new RegExp(CALCULATOR_PATTERN.source, 'gi')
    while ((match = re.exec(html)) !== null) {
      const slug = match[1] || match[2]
      if (slug) slugs.push(slug)
    }
    return slugs
  }, [html])

  // Strip author markers so they don't render as raw HTML
  const cleanHtml = useMemo(
    () => (html?.replace(CALCULATOR_PATTERN, '') || ''),
    [html]
  )

  // After innerHTML lands: swap legacy mintyfit calculator iframes for React components,
  // and re-execute any inline <script> tags (innerHTML doesn't auto-run them).
  useEffect(() => {
    const container = ref.current
    if (!container) return

    // Tear down previous roots before re-mounting on html change
    mountedRootsRef.current.forEach(r => { try { r.unmount() } catch {} })
    mountedRootsRef.current = []

    // 1) Replace legacy <iframe src=".../calculators/*.html"> with the matching component
    const iframes = Array.from(container.querySelectorAll('iframe'))
    iframes.forEach(iframe => {
      const slug = resolveLegacyIframeSlug(iframe.getAttribute('src'))
      if (!slug) return
      const mount = document.createElement('div')
      mount.dataset.calculatorMount = slug
      iframe.parentNode?.replaceChild(mount, iframe)
      const root = createRoot(mount)
      root.render(<BlogCalculatorEmbed slug={slug} />)
      mountedRootsRef.current.push(root)
    })

    // 2) Re-execute scripts
    const scripts = Array.from(container.querySelectorAll('script'))
    scripts.forEach(old => {
      const fresh = document.createElement('script')
      Array.from(old.attributes).forEach(attr => fresh.setAttribute(attr.name, attr.value))
      if (!old.src && old.textContent) fresh.textContent = old.textContent
      old.parentNode?.replaceChild(fresh, old)
    })

    return () => {
      mountedRootsRef.current.forEach(r => { try { r.unmount() } catch {} })
      mountedRootsRef.current = []
    }
  }, [cleanHtml])

  // Auto-resize iframes that postMessage their height (any remaining non-legacy iframes)
  useEffect(() => {
    function onMessage(e) {
      const h = e.data?.height || e.data?.iframeHeight
      if (!h || !ref.current) return
      const iframes = ref.current.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        if (iframe.contentWindow === e.source) {
          iframe.style.height = h + 'px'
        }
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <>
      <div
        ref={ref}
        style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-primary, #374151)' }}
        dangerouslySetInnerHTML={{ __html: cleanHtml || '<p>Content coming soon.</p>' }}
      />
      {/* Render calculators flagged by author markers */}
      {calculatorSlugs.map((slug, index) => (
        <BlogCalculatorEmbed key={`${slug}-${index}`} slug={slug} />
      ))}
    </>
  )
}
