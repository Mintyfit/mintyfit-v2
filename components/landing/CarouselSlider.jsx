'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

function getVisibleCount() {
  if (typeof window === 'undefined') return 4
  const w = window.innerWidth
  if (w < 640) return 1
  if (w < 1024) return 2
  return 4
}

export default function CarouselSlider({ items, renderCard, title, subtitle, linkHref, linkLabel }) {
  const [visibleCount, setVisibleCount] = useState(4)
  const [cardW, setCardW] = useState(0)
  const [slide, setSlide] = useState(4)
  const [animate, setAnimate] = useState(true)
  const [hovered, setHovered] = useState(false)
  const viewportRef = useRef(null)

  useEffect(() => {
    function measure() {
      if (viewportRef.current) {
        const count = getVisibleCount()
        setVisibleCount(count)
        setCardW((viewportRef.current.offsetWidth - (count - 1) * 24) / count)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    setAnimate(false)
    setSlide(visibleCount)
  }, [visibleCount])

  useEffect(() => {
    if (items.length <= visibleCount || cardW === 0 || hovered) return
    const t = setInterval(() => {
      setAnimate(true)
      setSlide(s => s + 1)
    }, 3000)
    return () => clearInterval(t)
  }, [items.length, cardW, hovered, visibleCount])

  useEffect(() => {
    if (animate) return
    const t = setTimeout(() => setAnimate(true), 50)
    return () => clearTimeout(t)
  }, [animate])

  const gap = 24
  const step = cardW + gap
  const n = items.length
  const ready = cardW > 0 && n > 0

  const extended = ready
    ? [...items.slice(-visibleCount), ...items, ...items.slice(0, visibleCount)]
    : []

  const realIdx = ((slide - visibleCount) % n + n) % n
  const maxDot = Math.max(0, n - visibleCount)
  const activeDot = Math.min(realIdx, maxDot)

  function onTransitionEnd() {
    if (slide >= visibleCount + n) {
      setAnimate(false)
      setSlide(s => s - n)
    } else if (slide < visibleCount) {
      setAnimate(false)
      setSlide(s => s + n)
    }
  }

  function prev() { setAnimate(true); setSlide(s => s - 1) }
  function next() { setAnimate(true); setSlide(s => s + 1) }
  function goTo(i) { setAnimate(true); setSlide(visibleCount + i) }

  if (!items.length) return null

  return (
    <section style={{ padding: '3rem 1.25rem', background: 'var(--bg-page)' }}>
      <h2 style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--text-1)', marginBottom: '0.5rem' }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
          {subtitle}
        </p>
      )}
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', padding: '0 28px' }}>
        {ready && n > visibleCount && (
          <>
            <button onClick={prev} aria-label="Previous"
              style={{ position: 'absolute', left: -4, top: '45%', transform: 'translateY(-50%)', zIndex: 2, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--primary)', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
              ‹
            </button>
            <button onClick={next} aria-label="Next"
              style={{ position: 'absolute', right: -4, top: '45%', transform: 'translateY(-50%)', zIndex: 2, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--primary)', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
              ›
            </button>
          </>
        )}

        <div
          ref={viewportRef}
          style={{ overflow: 'hidden' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {ready ? (
            <div
              onTransitionEnd={onTransitionEnd}
              style={{
                display: 'flex',
                gap,
                alignItems: 'stretch',
                transform: `translateX(${-slide * step}px)`,
                transition: animate ? 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              }}
            >
              {extended.map((item, i) => (
                <div key={`${item.id}-${i}`} style={{ flex: `0 0 ${cardW}px`, minWidth: 0, display: 'flex' }}>
                  {renderCard(item)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', gap }}>
              {Array.from({ length: visibleCount }, (_, i) => i).map(i => (
                <div key={i} style={{ flex: `0 0 ${cardW || 260}px`, height: 340, borderRadius: 16, background: 'var(--border)', opacity: 0.3 }} />
              ))}
            </div>
          )}
        </div>

        {ready && maxDot > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {Array.from({ length: maxDot + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{
                  width: activeDot === i ? 24 : 8, height: 8, borderRadius: 4,
                  border: 'none', background: activeDot === i ? 'var(--primary)' : 'var(--border)',
                  cursor: 'pointer', padding: 0, transition: 'width 0.2s, background 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {linkHref && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href={linkHref}
            style={{ display: 'inline-block', border: '2px solid var(--primary)', color: 'var(--primary)', padding: '0.625rem 1.75rem', borderRadius: '24px', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)' }}
          >
            {linkLabel || 'View all →'}
          </Link>
        </div>
      )}
    </section>
  )
}
