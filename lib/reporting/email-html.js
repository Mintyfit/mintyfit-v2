/**
 * Weekly SEO report e-mail rendering: compact HTML (inline styles — mail
 * client safe) + plain-text fallback. Content: scorecard, LLM narrative
 * (when present), grouped insights, link to the full admin report.
 */

const SEV_META = {
  negative: { label: 'Critical', color: '#b91c1c', bg: '#fee2e2' },
  warning: { label: 'Attention', color: '#92400e', bg: '#fef3c7' },
  opportunity: { label: 'Opportunity', color: '#1d4ed8', bg: '#dbeafe' },
  positive: { label: 'Positive', color: '#166534', bg: '#dcfce7' },
}

const AREA_LABELS = {
  seo: 'SEO / GSC',
  ga4: 'Traffic (GA4)',
  strategy: 'Strategy & content',
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Minimal markdown -> HTML for the LLM narrative (##, ###, **, -, 1., paragraphs). */
export function markdownToHtml(md) {
  const lines = md.split(/\r?\n/)
  const html = []
  let listOpen = null
  const closeList = () => {
    if (listOpen) {
      html.push(listOpen === 'ul' ? '</ul>' : '</ol>')
      listOpen = null
    }
  }
  const inline = (s) =>
    escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^###\s+/.test(line)) {
      closeList()
      html.push(`<h3 style="margin:14px 0 6px;font-size:15px;color:#1a2b22;">${inline(line.replace(/^###\s+/, ''))}</h3>`)
    } else if (/^##\s+/.test(line)) {
      closeList()
      html.push(`<h2 style="margin:18px 0 8px;font-size:17px;color:#1a2b22;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${inline(line.replace(/^##\s+/, ''))}</h2>`)
    } else if (/^[-*]\s+/.test(line)) {
      if (listOpen !== 'ul') {
        closeList()
        html.push('<ul style="margin:6px 0;padding-left:22px;">')
        listOpen = 'ul'
      }
      html.push(`<li style="margin:3px 0;">${inline(line.replace(/^[-*]\s+/, ''))}</li>`)
    } else if (/^\d+\.\s+/.test(line)) {
      if (listOpen !== 'ol') {
        closeList()
        html.push('<ol style="margin:6px 0;padding-left:22px;">')
        listOpen = 'ol'
      }
      html.push(`<li style="margin:3px 0;">${inline(line.replace(/^\d+\.\s+/, ''))}</li>`)
    } else if (line.trim() === '') {
      closeList()
    } else {
      closeList()
      html.push(`<p style="margin:8px 0;">${inline(line)}</p>`)
    }
  }
  closeList()
  return html.join('\n')
}

function scorecard(report) {
  const g = report.snapshot.gsc
  const a = report.snapshot.ga4
  const b = report.snapshot.blog
  const r1 = (n) => Math.round(n * 10) / 10
  const cells = [
    g ? ['GSC clicks/day', r1(g.current.clicks / g.current.days), `prev ${r1(g.previous.clicks / g.previous.days)}`] : null,
    g ? ['Impressions/day', r1(g.current.impressions / g.current.days), `prev ${r1(g.previous.impressions / g.previous.days)}`] : null,
    g ? ['Avg position', r1(g.current.position), `prev ${r1(g.previous.position)}`] : null,
    a ? ['Sessions', a.current.sessions, `prev ${a.previous.sessions}`] : null,
    b ? ['Posts this week', b.publishedThisWeek.length, `${b.totalPublished} total`] : null,
  ].filter(Boolean)

  if (cells.length === 0) return ''
  const tds = cells
    .map(
      ([label, value, sub]) => `
      <td style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">${escapeHtml(label)}</div>
        <div style="font-size:22px;font-weight:700;color:#1a2b22;margin:2px 0;">${escapeHtml(String(value))}</div>
        <div style="font-size:11px;color:#9ca3af;">${escapeHtml(sub)}</div>
      </td>`,
    )
    .join('<td style="width:6px;"></td>')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>${tds}</tr></table>`
}

function insightsHtml(insights) {
  if (insights.length === 0) return ''
  const rows = insights
    .map((i) => {
      const sev = SEV_META[i.severity] ?? SEV_META.positive
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top;width:110px;">
          <span style="display:inline-block;background:${sev.bg};color:${sev.color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;">${sev.label}</span>
          <div style="font-size:10px;color:#9ca3af;margin-top:4px;">${escapeHtml(AREA_LABELS[i.area] ?? i.area)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:14px;font-weight:600;color:#1a2b22;margin-bottom:2px;">${escapeHtml(i.title)}</div>
          <div style="font-size:13px;color:#4b5563;">${escapeHtml(i.detail)}</div>
          <div style="font-size:13px;color:#2d6e2e;margin-top:4px;"><strong>Next:</strong> ${escapeHtml(i.action)}</div>
        </td>
      </tr>`
    })
    .join('')
  return `
    <h2 style="margin:20px 0 8px;font-size:17px;color:#1a2b22;">Findings (${insights.length})</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">${rows}</table>`
}

function errorsHtml(errors) {
  if (!errors || errors.length === 0) return ''
  const items = errors.map((e) => `<li style="margin:2px 0;">${escapeHtml(e)}</li>`).join('')
  return `
    <div style="margin-top:20px;padding:10px 14px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;">
      <strong>Data gaps this week:</strong>
      <ul style="margin:4px 0 0;padding-left:18px;">${items}</ul>
    </div>`
}

export function buildReportEmail(report, adminUrl) {
  const subject = `MintyFit SEO weekly — ${report.weekStart} → ${report.weekEnd}`

  const narrativeHtml = report.narrative
    ? `<h2 style="margin:20px 0 8px;font-size:17px;color:#1a2b22;">Analysis</h2>
       <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;font-size:14px;color:#374151;line-height:1.55;">
         ${markdownToHtml(report.narrative)}
       </div>`
    : '<p style="font-size:13px;color:#9ca3af;">(LLM narrative unavailable — findings below are rules-only.)</p>'

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:24px 16px;">
    <div style="margin-bottom:16px;">
      <div style="font-size:20px;font-weight:800;color:#2d6e2e;">MintyFit SEO weekly</div>
      <div style="font-size:13px;color:#6b7280;">${escapeHtml(report.weekStart)} → ${escapeHtml(report.weekEnd)} · generated ${escapeHtml(report.createdAt.slice(0, 10))}</div>
    </div>
    ${scorecard(report)}
    ${narrativeHtml}
    ${insightsHtml(report.insights)}
    ${errorsHtml(report.snapshot.errors)}
    <div style="margin:24px 0;">
      <a href="${adminUrl}" style="display:inline-block;background:#2d6e2e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">Open full report in admin</a>
    </div>
    <div style="font-size:11px;color:#9ca3af;margin-top:16px;">
      Sent by the MintyFit weekly SEO report (Vercel cron, Fridays). Recipients are managed in Admin → SEO Reports.
    </div>
  </div>
</body></html>`

  /* Plain-text fallback */
  const lines = [
    `MintyFit SEO weekly — ${report.weekStart} → ${report.weekEnd}`,
    '',
  ]
  if (report.narrative) {
    lines.push(report.narrative, '')
  }
  lines.push(`Findings (${report.insights.length}):`)
  for (const i of report.insights) {
    lines.push(`- [${(SEV_META[i.severity] ?? SEV_META.positive).label}] ${i.title}`, `  Next: ${i.action}`)
  }
  if (report.snapshot.errors?.length) {
    lines.push('', `Data gaps: ${report.snapshot.errors.join('; ')}`)
  }
  lines.push('', `Full report: ${adminUrl}`)

  return { subject, html, text: lines.join('\n') }
}
