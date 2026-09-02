import DOMPurify from 'isomorphic-dompurify'

/**
 * SafeHtml — the ONLY place in the app allowed to use dangerouslySetInnerHTML.
 *
 * Sanitizes author/admin-authored HTML (blog posts, CMS pages) before render.
 * Works in Server Components and Client Components (isomorphic-dompurify uses
 * jsdom server-side, native DOM on the client).
 *
 * Scripts, event handlers (onclick etc.) and javascript: URLs are stripped.
 * iframes are allowed (legacy calculator embeds) — their scripts run confined
 * to the iframe's own document.
 */
const DEFAULT_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'loading', 'title', 'style'],
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
}

export default function SafeHtml({ html, config, style, className }) {
  const clean = DOMPurify.sanitize(html || '', { ...DEFAULT_CONFIG, ...config })
  return (
    <div
      style={style}
      className={className}
      dangerouslySetInnerHTML={{ __html: clean || '<p>Content coming soon.</p>' }}
    />
  )
}
