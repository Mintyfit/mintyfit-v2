import Link from 'next/link'
import { listWeeklyReports, getReportRecipients } from '@/lib/reporting/store'
import { GenerateButton, DeleteButton, RecipientsForm } from './SeoReportsClient'

export const metadata = { title: 'SEO Reports — Admin' }
export const dynamic = 'force-dynamic'

const r1 = (n) => Math.round(n * 10) / 10
const fmtDate = (iso) => iso.split('-').reverse().join('.')

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f0f0f0', fontWeight: 600 }
const td = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f6f6f6', color: '#1f2937' }

export default async function SeoReportsPage() {
  const [reports, recipients] = await Promise.all([
    listWeeklyReports(52).catch(() => []),
    getReportRecipients().catch(() => ''),
  ])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>SEO weekly reports</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            GSC + GA4 + blog activity, analysed against <code>SEO-STRATEGY.md</code>. Auto-generated every Friday 06:00 UTC and e-mailed to the recipients below.
          </p>
        </div>
        <GenerateButton />
      </div>

      {/* Recipients ("clients") */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f0f0f0', padding: 16, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>Report recipients</div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>
          Everyone on this list receives the weekly report e-mail. Sent from <code>RESEND_FROM_REPORTS</code>.
        </p>
        <RecipientsForm initial={recipients} />
      </div>

      {/* Reports table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={th}>Week</th>
              <th style={th}>Clicks/day</th>
              <th style={th}>Impr./day</th>
              <th style={th}>Sessions</th>
              <th style={th}>Posts</th>
              <th style={th}>Findings</th>
              <th style={th}>E-mail</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr><td colSpan={8} style={{ ...td, color: '#9ca3af', textAlign: 'center', padding: 32 }}>
                No reports yet. Click "Generate now" or wait for the Friday cron.
              </td></tr>
            )}
            {reports.map((r) => {
              const g = r.snapshot?.gsc
              const a = r.snapshot?.ga4
              const b = r.snapshot?.blog
              return (
                <tr key={r.id}>
                  <td style={td}>
                    <Link href={`/mintadmn/seo-reports/${r.id}`} style={{ color: '#2d6e2e', fontWeight: 600, textDecoration: 'none' }}>
                      {fmtDate(r.weekStart)} – {fmtDate(r.weekEnd)}
                    </Link>
                  </td>
                  <td style={td}>{g ? r1(g.current.clicks / g.current.days) : '–'}</td>
                  <td style={td}>{g ? r1(g.current.impressions / g.current.days) : '–'}</td>
                  <td style={td}>{a ? a.current.sessions : '–'}</td>
                  <td style={td}>{b ? b.publishedThisWeek.length : '–'}</td>
                  <td style={td}>{r.insights.length}</td>
                  <td style={{ ...td, fontSize: 12 }}>
                    {r.emailSentAt
                      ? <span style={{ color: '#166534' }}>Sent {fmtDate(r.emailSentAt.slice(0, 10))}</span>
                      : r.emailError
                        ? <span style={{ color: '#b91c1c' }} title={r.emailError}>Failed</span>
                        : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <DeleteButton id={r.id} week={`${fmtDate(r.weekStart)} – ${fmtDate(r.weekEnd)}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
