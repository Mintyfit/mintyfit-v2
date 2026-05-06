'use client'

import { useEffect, useRef, useState } from 'react'
import BlogCalculatorEmbed from '@/components/calculators/BlogCalculatorEmbed'

// Pattern to match calculator embeds: <!-- CALCULATOR:slug --> or <div data-calculator="slug"></div>
const CALCULATOR_PATTERN = /<!--\s*CALCULATOR:\s*([a-z0-9-]+)\s*-->|<div\s+data-calculator\s*=\s*["']([a-z0-9-]+)["']\s*><\/div>/gi

export default function BlogContent({ html }) {
  const ref = useRef(null)
  const [calculatorSlugs, setCalculatorSlugs] = useState([])

  // Parse calculator embeds from HTML
  useEffect(() => {
    if (!html) return
    const slugs = []
    let match
    while ((match = CALCULATOR_PATTERN.exec(html)) !== null) {
      const slug = match[1] || match[2]
      if (slug) slugs.push(slug)
    }
    setCalculatorSlugs(slugs)
  }, [html])

  // Re-execute <script> tags injected via dangerouslySetInnerHTML
  useEffect(() => {
    if (!ref.current) return
    const scripts = Array.from(ref.current.querySelectorAll('script'))
    scripts.forEach(old => {
      const fresh = document.createElement('script')
      Array.from(old.attributes).forEach(attr =>
        fresh.setAttribute(attr.name, attr.value)
      )
      if (!old.src && old.textContent) {
        fresh.textContent = old.textContent
      }
      old.parentNode?.replaceChild(fresh, old)
    })
  }, [html])

  // Auto-resize iframes that postMessage their height (for calculators)
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

  // Remove calculator embed markers from HTML to avoid duplicates
  const cleanHtml = html?.replace(CALCULATOR_PATTERN, '') || ''

  return (
    <>
      <div
        ref={ref}
        style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-primary, #374151)' }}
        dangerouslySetInnerHTML={{ __html: cleanHtml || '<p>Content coming soon.</p>' }}
      />
      {/* Render calculators as React components */}
      {calculatorSlugs.map((slug, index) => (
        <BlogCalculatorEmbed key={`${slug}-${index}`} slug={slug} />
      ))}
    </>
  )
}
