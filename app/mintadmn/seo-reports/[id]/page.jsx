import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getWeeklyReport } from '@/lib/reporting/store'
import { markdownToHtml } from '@/lib/reporting/email-html'
import { ResendButton } from '../SeoReportsClient'

export const metadata = { title: 'SEO Report — Admin' }
export const dynamic = 'force-dynamic'

const r1 = (n) => Math.round(n * 10) / 10
const fmtPos = (p) => (p === null || p === undefined ? '–' : r1(p).toFixed(1))

const SEV_STYLE = {
  negative: { label: 'Critical', color: '#b91c1c', bg: '#fee2e2' },
  warning: { label: 'Attention', color: '#92400e', bg: '#fef3c7' },
  opportunity: { label: 'Opportunity', color: '#1d4ed8', bg: '#dbeafe' },
  positive: { label: 'Positive', color: '#166534', bg: '#dcfce7' },
}

const card = { background: 'white', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 20, marginBottom: 20 }
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f6f6f6', color: '#1f2937' }

function Scorecard({ report }) {
  const g = report.snapshot.gsc
  const a = report.snapshot.ga4
  const b = report.snapshot.blog
  const cells = [
    g && { label: 'GSC clicks/day', value: r1(g.current.clicks / g.current.days), sub: `prev ${r1(g.previous.clicks / g.previous.days)}` },
    g && { label: 'Impressions/day', value: r1(g.current.impressions / g.current.days), sub: `prev ${r1(g.previous.impressions / g.previous.days)}` },
    g && { label: 'Avg position', value: r1(g.current.position), sub: `prev ${r1(g.previous.position)}` },
    a && { label: 'Sessions', value: a.current.sessions, sub: `prev ${a.previous.sessions}` },
    b && { label: 'Posts this week', value: b.publishedThisWeek.length, sub: `${b.totalPublished} total` },
  ].filter(Boolean)
  if (cells.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      {cells.map((c) => (
        <div key={c.label} style={{ ...card, marginBottom: 0, padding: '14px 20px', minWidth: 130, textAlign: 'center' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>{c.label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#1a2b22', margin: '4px 0' }}>{c.value}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default async function SeoReportDetailPage({ params }) {
  const { id } = await params
  const report = await getWeeklyReport(Number(id))
  if (!report) notFound()

  const g = report.snapshot.gsc
  const blog = report.snapshot.blog
  const families = g?.families?.filter((f) => f.current.impressions > 0 || f.previous.impressions > 0) ?? []
  const newQueries = g?.newQueries?.slice(0, 15) ?? []

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Link href="/mintadmn/seo-reports" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← All reports</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>
            Week {report.weekStart} → {report.weekEnd}
          </h2>
          <ResendButton id={report.id} />
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
          Generated {new Date(report.createdAt).toLocaleString('en-GB')}
          {report.emailSentAt && <> · e-mail sent {new Date(report.emailSentAt).toLocaleString('en-GB')}</>}
          {report.emailError && <span style={{ color: '#b91c1c' }}> · e-mail error: {report.emailError}</span>}
        </p>
      </div>

      <Scorecard report={report} />

      {/* LLM narrative */}
      <div style={card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#1f2937' }}>Analysis</h3>
        {report.narrative ? (
          <div
            style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(report.narrative) }}
          />
        ) : (
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>No LLM narrative — rules-only report (ANTHROPIC_API_KEY unset, API failure, or number-audit rejection).</p>
        )}
      </div>

      {/* Insights */}
      <div style={card}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#1f2937' }}>Findings ({report.insights.length})</h3>
        {report.insights.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>No findings this week.</p>}
        {report.insights.map((i, idx) => {
          const sev = SEV_STYLE[i.severity] ?? SEV_STYLE.positive
          return (
            <div key={idx} style={{ borderTop: idx === 0 ? 'none' : '1px solid #f6f6f6', padding: '12px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ background: sev.bg, color: sev.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>{sev.label}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{i.area}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1a2b22' }}>{i.title}</span>
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>{i.detail}</div>
              <div style={{ fontSize: 13, color: '#2d6e2e' }}><strong>Next:</strong> {i.action}</div>
            </div>
          )
        })}
      </div>

      {/* Keyword families */}
      {families.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#1f2937' }}>Keyword families (pillars)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Family</th>
                <th style={th}>Pos</th>
                <th style={th}>Prev</th>
                <th style={th}>Impressions</th>
                <th style={th}>Clicks</th>
                <th style={th}>Carrier page</th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr key={f.id}>
                  <td style={td}>{f.label}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmtPos(f.current.position)}</td>
                  <td style={{ ...td, color: '#9ca3af' }}>{fmtPos(f.previous.position)}</td>
                  <td style={td}>{f.current.impressions}</td>
                  <td style={td}>{f.current.clicks}</td>
                  <td style={{ ...td, fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>{f.carrier?.page ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New queries */}
      {newQueries.length > 0 && (
        <div style={card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#1f2937' }}>New queries this week</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={th}>Query</th><th style={th}>Impressions</th><th style={th}>Pos</th><th style={th}>Page</th></tr>
            </thead>
            <tbody>
              {newQueries.map((q) => (
                <tr key={q.query}>
                  <td style={td}>{q.query}</td>
                  <td style={td}>{q.impressions}</td>
                  <td style={td}>{fmtPos(q.position)}</td>
                  <td style={{ ...td, fontSize: 12, color: '#6b7280', wordBreak: 'break-all' }}>{q.page ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Blog activity */}
      {blog && (
        <div style={card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, color: '#1f2937' }}>Blog activity</h3>
          {blog.publishedThisWeek.length === 0 ? (
            <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
              No posts published this week. Days since last post: {blog.daysSinceLastPost ?? '–'}.
            </p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#374151' }}>
              {blog.publishedThisWeek.map((p) => (
                <li key={p.slug}><a href={`/blog/${p.slug}`} style={{ color: '#2d6e2e' }}>{p.title}</a></li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Data errors */}
      {report.snapshot.errors?.length > 0 && (
        <div style={{ ...card, background: '#fef3c7', border: '1px solid #fde68a' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#92400e' }}>Data gaps</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#92400e' }}>
            {report.snapshot.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
