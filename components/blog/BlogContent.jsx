'use client'

import { useEffect, useMemo, useRef } from 'react'
import BlogCalculatorEmbed from '@/components/calculators/BlogCalculatorEmbed'

// Markers placed by content authors: <!-- CALCULATOR:slug --> or <div data-calculator="slug"></div>
const CALCULATOR_PATTERN = /<!--\s*CALCULATOR:\s*([a-z0-9-]+)\s*-->|<div\s+data-calculator\s*=\s*["']([a-z0-9-]+)["']\s*><\/div>/gi

// Legacy posts embed calculators as <iframe src="https://(app.)mintyfit.com/calculators/<file>.html">.
// The same files now live under public/calculators/, so we rewrite the src to a same-origin path.
const LEGACY_CALC_HOST_RE = /^https?:\/\/(?:[a-z0-9-]+\.)*mintyfit\.com\/calculators\//i

export default function BlogContent({ html }) {
  const ref = useRef(null)

  // Author-placed calculator markers (rendered as React components after the content)
  const calculatorSlugs = useMemo(() => {
    if (!html) return []
    const slugs = []
    const re = new RegExp(CALCULATOR_PATTERN.source, 'gi')
    let match
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

  // After innerHTML lands: rewrite legacy mintyfit.com calculator iframes to local paths,
  // and re-execute any inline <script> tags (innerHTML doesn't auto-run them).
  useEffect(() => {
    const container = ref.current
    if (!container) return

    container.querySelectorAll('iframe').forEach(iframe => {
      const src = iframe.getAttribute('src')
      if (src && LEGACY_CALC_HOST_RE.test(src)) {
        iframe.setAttribute('src', src.replace(LEGACY_CALC_HOST_RE, '/calculators/'))
      }
    })

    container.querySelectorAll('script').forEach(old => {
      const fresh = document.createElement('script')
      Array.from(old.attributes).forEach(attr => fresh.setAttribute(attr.name, attr.value))
      if (!old.src && old.textContent) fresh.textContent = old.textContent
      old.parentNode?.replaceChild(fresh, old)
    })
  }, [cleanHtml])

  // Auto-resize iframes that postMessage their height
  useEffect(() => {
    function onMessage(e) {
      const h = e.data?.height || e.data?.iframeHeight
      if (!h || !ref.current) return
      ref.current.querySelectorAll('iframe').forEach(iframe => {
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
      {calculatorSlugs.map((slug, index) => (
        <BlogCalculatorEmbed key={`${slug}-${index}`} slug={slug} />
      ))}
    </>
  )
}
