import sanitizeHtml from 'sanitize-html'

/**
 * SafeHtml — the ONLY place in the app allowed to use dangerouslySetInnerHTML.
 *
 * Sanitizes author/admin-authored HTML (blog posts, CMS pages) before render.
 * Uses sanitize-html (pure JS, zero DOM deps) in EVERY environment — server
 * components, SSR of client components, and browser hydration all produce
 * identical output, so SSR content is real HTML (SEO) with no hydration drift.
 *
 * History (2026-11-11 incident): this component previously used
 * isomorphic-dompurify, whose server entry pulls jsdom → html-encoding-sniffer
 * (CJS) → require() of ESM-only @exodus/bytes → ERR_REQUIRE_ESM hard-crashed
 * every Vercel function where a server component imported SafeHtml (/pages/*
 * 500'd in production; local Node 24 has require(esm) so it never failed in
 * dev). Do NOT reintroduce jsdom-based sanitization server-side.
 *
 * Scripts, event handlers (onclick etc.) and javascript: URLs are stripped.
 * iframes are allowed (legacy calculator embeds) — their scripts run confined
 * to the iframe's own document.
 */

// Parity with the old DOMPurify config: standard benign HTML + iframes;
// script/object/embed/form/input/button never allowed; style/class/id/title
// allowed globally (matches DOMPurify defaults); safe URL schemes only.
const ALLOWED_TAGS = sanitizeHtml.defaults.allowedTags.concat([
  'img', 'picture', 'source', 'video', 'audio', 'iframe', 'del', 'ins', 'details', 'summary',
])
const ALLOWED_ATTR = {
  ...sanitizeHtml.defaults.allowedAttributes,
  '*': ['class', 'id', 'style', 'title', 'dir', 'lang'],
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
  iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'title', 'style'],
  source: ['src', 'srcset', 'type', 'media'],
  video: ['src', 'controls', 'poster', 'preload', 'loop', 'muted', 'playsinline'],
  audio: ['src', 'controls', 'preload', 'loop', 'muted'],
}
const CONFIG = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTR,
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowProtocolRelative: false,
  allowIframeRelativeUrls: true, // BlogContent rewrites calculator embeds to /calculators/*
}

export default function SafeHtml({ html, config, style, className }) {
  const clean = sanitizeHtml(html || '', { ...CONFIG, ...config })
  return (
    <div
      style={style}
      className={className}
      dangerouslySetInnerHTML={{ __html: clean || '<p>Content coming soon.</p>' }}
    />
  )
}
