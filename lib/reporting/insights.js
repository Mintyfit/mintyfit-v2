/**
 * Rule-based insights engine — deterministic findings + next actions derived
 * from the snapshot, framed by SEO-STRATEGY.md. Thresholds: ±3 positions =
 * movement, <10 weekly impressions = statistical noise, striking distance =
 * position 4–15 with ≥30 impressions, content gap = pillar impressions ≥25
 * but position >20.
 *
 * The LLM narrative (llm.js) gets these insights + the digest as input, so
 * the model prioritizes/phrases — the facts always come from here.
 */

const NOISE_IMPRESSIONS = 10
/** Blog cadence per SEO-STRATEGY.md §4.8: 1 post/week. */
const CADENCE_WARN_DAYS = 14

const round1 = (n) => Math.round(n * 10) / 10
const fmtPos = (p) => (p === null || p === undefined ? '–' : round1(p).toFixed(1))
const pctChange = (cur, prev) => (prev === 0 ? (cur > 0 ? 100 : null) : ((cur - prev) / prev) * 100)
const carrierLine = (f) => (f.carrier ? `Carrier page: ${f.carrier.page}. ` : '')

function gscInsights(gsc, out) {
  const curPerDay = gsc.current.clicks / gsc.current.days
  const prevPerDay = gsc.previous.clicks / gsc.previous.days
  const clicksDelta = pctChange(curPerDay, prevPerDay)

  if (clicksDelta !== null && clicksDelta <= -15) {
    out.push({
      area: 'seo',
      severity: 'negative',
      title: `Organic clicks declining (${round1(curPerDay)} → ${round1(prevPerDay)} clicks/day, ${Math.round(clicksDelta)}%)`,
      detail: 'GSC daily click volume fell more than 15% week over week.',
      action: 'Check which pillar families dropped: a single-cluster drop → inspect its carrier page; a broad drop → check indexing (GSC Pages report) and possible technical issues.',
    })
  } else if (clicksDelta !== null && clicksDelta >= 15) {
    out.push({
      area: 'seo',
      severity: 'positive',
      title: `Organic clicks growing (${round1(prevPerDay)} → ${round1(curPerDay)} clicks/day, +${Math.round(clicksDelta)}%)`,
      detail: 'GSC daily click volume grew more than 15% week over week.',
      action: 'Identify the pages driving growth and reinforce them (fresh examples, internal links) — rising pages respond fastest to improvements.',
    })
  }

  /* --- keyword families (pillars) --- */
  const families = gsc.families.filter((f) => f.current.impressions > 0 || f.previous.impressions > 0)
  const noisy = (f) => f.current.impressions < NOISE_IMPRESSIONS && f.previous.impressions < NOISE_IMPRESSIONS

  const risers = families.filter((f) =>
    !noisy(f) && f.current.position !== null && f.previous.position !== null &&
    f.previous.position - f.current.position >= 3)
  const fallers = families.filter((f) =>
    !noisy(f) && f.current.position !== null && f.previous.position !== null &&
    f.current.position - f.previous.position >= 3)
  const striking = families.filter((f) =>
    !noisy(f) && f.current.position !== null && f.current.position >= 4 && f.current.position <= 15 &&
    f.current.impressions >= 30)
  const lowCtr = families.filter((f) =>
    !noisy(f) && f.current.impressions >= 60 && f.current.position !== null && f.current.position <= 10 &&
    f.current.impressions > 0 && f.current.clicks / f.current.impressions < 0.015)

  for (const f of risers.slice(0, 5)) {
    out.push({
      area: 'seo',
      severity: 'positive',
      title: `"${f.label}" rose ${fmtPos(f.previous.position)} → ${fmtPos(f.current.position)}`,
      detail: `${f.current.impressions} impressions, ${f.current.clicks} clicks this week.${f.carrier ? ` Carrier: ${f.carrier.page}` : ''}`,
      action: `${carrierLine(f)}Consolidate the gain: refresh the carrier page (new examples, updated FAQ) and add 1–2 internal links with keyword anchors from sibling posts.`,
    })
  }
  for (const f of fallers.slice(0, 5)) {
    out.push({
      area: 'seo',
      severity: 'negative',
      title: `"${f.label}" fell ${fmtPos(f.previous.position)} → ${fmtPos(f.current.position)}`,
      detail: `${f.current.impressions} impressions this week (previous: ${f.previous.impressions}).${f.carrier ? ` Carrier: ${f.carrier.page}` : ''}`,
      action: f.carrier
        ? `${carrierLine(f)}Strengthen that page's content and internal links. Also check whether Google is swapping the carrier page — if it is, redirect internal links to the intended one.`
        : 'Check which page serves these queries (GSC → Pages). If the carrier changed, steer it back with internal links; if it is stable, expand the content.',
    })
  }
  for (const f of striking.slice(0, 4)) {
    out.push({
      area: 'seo',
      severity: 'opportunity',
      title: `Striking distance: "${f.label}" at position ${fmtPos(f.current.position)} (${f.current.impressions} impressions/week)`,
      detail: `At position 4–15, content and internal-link work is often enough to reach page one.${f.carrier ? ` Carrier: ${f.carrier.page}` : ''}`,
      action: `${carrierLine(f)}Expand the carrier page (pricing, process, FAQ, real examples), tighten title/meta, and add internal links from the pillar hub.`,
    })
  }

  /* --- carrier swap: Google changed which page serves a family --- */
  const swapped = families.filter((f) => f.carrier && f.prevCarrier && f.carrier.page !== f.prevCarrier.page)
  for (const f of swapped.slice(0, 3)) {
    out.push({
      area: 'seo',
      severity: 'warning',
      title: `"${f.label}" carrier page changed`,
      detail: `Google now serves these queries with ${f.carrier.page} (last week: ${f.prevCarrier.page}).`,
      action: 'Point internal links deliberately at the preferred (conversion-capable) page and strengthen it; if the swap is just Google testing, keep both pages strong but anchors on the intended carrier.',
    })
  }
  for (const f of lowCtr.slice(0, 3)) {
    const ctr = (f.current.clicks / f.current.impressions) * 100
    out.push({
      area: 'seo',
      severity: 'opportunity',
      title: `Low CTR at a good position: "${f.label}" (${ctr.toFixed(1)}%, pos ${fmtPos(f.current.position)})`,
      detail: `${f.current.impressions} impressions but only ${f.current.clicks} clicks — page-one visibility is not converting to visits.`,
      action: 'Rewrite title + meta description: number/year, concrete benefit ("free weekly plan + grocery list"), and the family angle.',
    })
  }

  /* --- new queries = editorial input --- */
  const fresh = gsc.newQueries.slice(0, 6)
  if (fresh.length > 0) {
    const list = fresh
      .map((q) => `"${q.query}" (${q.impressions} impressions, pos ${fmtPos(q.position)}${q.page ? `, page ${q.page}` : ''})`)
      .join(', ')
    out.push({
      area: 'seo',
      severity: 'opportunity',
      title: `${fresh.length} new queries appeared this week`,
      detail: list,
      action: 'Map each query to a strategy pillar: fits a pillar → blog-post candidate (or fold into the carrier page as an FAQ/section); fits no pillar → check SEO-STRATEGY.md §2 before writing anything.',
    })
  }
}

function strategyInsights(snapshot, out) {
  const { gsc, blog } = snapshot

  /* Content gap: pillar families with impressions but position >20. */
  if (gsc) {
  const gaps = gsc.families.filter((f) =>
    f.pillar !== 'brand' && f.pillar !== 'watch' &&
    f.current.impressions >= 25 &&
    (f.current.position === null || f.current.position > 20))
  if (gaps.length > 0) {
    const list = gaps.map((f) => `"${f.label}" (${f.current.impressions} impressions, pos ${fmtPos(f.current.position)})`).join(', ')
    out.push({
      area: 'strategy',
      severity: 'opportunity',
      title: `Content gap: ${gaps.length} pillar(s) visible but ranking beyond position 20`,
      detail: list,
      action: 'Create the missing content per SEO-STRATEGY.md §3: blog post for informational intent, /menus/ or tool page for transactional intent; link from the pillar hub.',
    })
  }

  /* Silent pillars: no impressions at all — content not started or not indexed. */
  const silent = gsc.families.filter((f) =>
    f.pillar !== 'brand' && f.pillar !== 'watch' &&
    f.current.impressions === 0 && f.previous.impressions === 0)
  if (silent.length > 0) {
    const list = silent.map((f) => `"${f.label}"`).join(', ')
    out.push({
      area: 'strategy',
      severity: 'warning',
      title: `${silent.length} pillar(s) with zero search impressions`,
      detail: `${list}. Either no content exists yet for these families, or what exists is not being indexed/ranked.`,
      action: 'Confirm content exists for each silent pillar (check the pillar map in SEO-STRATEGY.md §3). If posts exist, check indexing in GSC Pages and strengthen internal links to them.',
    })
  }

  /* YMYL drift watch: accidental visibility in out-of-scope medical queries. */
  const watch = gsc.families.find((f) => f.pillar === 'watch')
  if (watch && watch.current.impressions >= 25) {
    out.push({
      area: 'strategy',
      severity: 'warning',
      title: `Out-of-scope visibility: kids' medical/nutrient queries (${watch.current.impressions} impressions)`,
      detail: 'We are appearing for nutrient-RDA-type queries that SEO-STRATEGY.md §2 explicitly deprioritizes (YMYL — requires credentialed review we do not have).',
      action: 'Do not chase this traffic. Keep any such content practical (food lists, meal ideas) and link out to AAP/CDC for the medical numbers.',
    })
  }
  } // end if (gsc)

  /* Publishing cadence — independent of GSC (blog data comes from our DB). */
  if (blog) {
    if (blog.publishedThisWeek.length === 0 && (blog.daysSinceLastPost ?? 0) >= CADENCE_WARN_DAYS) {
      out.push({
        area: 'strategy',
        severity: 'warning',
        title: `No blog posts published in ${blog.daysSinceLastPost} days`,
        detail: `SEO-STRATEGY.md §4.8 requires 1 post/week alternating pillars. Total published so far: ${blog.totalPublished}.`,
        action: 'Publish this week\'s post from the pillar rotation — the strategy compounds only with consistent shipping.',
      })
    } else if (blog.publishedThisWeek.length > 0) {
      out.push({
        area: 'strategy',
        severity: 'positive',
        title: `${blog.publishedThisWeek.length} post(s) published this week`,
        detail: blog.publishedThisWeek.map((p) => `"${p.title}" (/blog/${p.slug})`).join(', ') + '.',
        action: 'Add internal links from the new post(s) to the pillar hub and 2–3 sibling posts; watch next week\'s new-queries section for early impressions.',
      })
    }
  }
}

function ga4Insights(ga4, out) {
  /* Tracking health first — broken measurement invalidates everything else. */
  const isWeekday = (yyyymmdd) => {
    const d = new Date(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T00:00:00Z`).getUTCDay()
    return d >= 1 && d <= 5
  }
  const weekdays = ga4.daily.filter((d) => isWeekday(d.date))
  const base = weekdays.length > 0 ? weekdays : ga4.daily
  if (base.length > 0) {
    const avg = base.reduce((s, d) => s + d.sessions, 0) / base.length
    const deadDays = base.filter((d) => d.sessions < 20).length
    if (avg < 20 || deadDays >= 2) {
      out.push({
        area: 'ga4',
        severity: 'negative',
        title: `GA4 tracking may be broken (avg ${round1(avg)} sessions/weekday, ${deadDays} weekdays under 20)`,
        detail: 'Very low weekday session counts usually mean a tracking fault (GTM/consent/script), not a traffic collapse.',
        action: 'Verify the analytics tag loads live (DevTools → Network), check consent-mode gating, and do not interpret this week\'s GA4 numbers until tracking recovers.',
      })
      return
    }
  }

  const sessDelta = pctChange(ga4.current.sessions, ga4.previous.sessions)
  if (sessDelta !== null && sessDelta <= -15) {
    out.push({
      area: 'ga4',
      severity: 'warning',
      title: `Sessions declining (${ga4.previous.sessions} → ${ga4.current.sessions}, ${Math.round(sessDelta)}%)`,
      detail: 'Total traffic fell more than 15% week over week.',
      action: 'Compare channels: if the drop is organic, see the GSC family table; if it is direct/referral, check for a lost mention or campaign end.',
    })
  } else if (sessDelta !== null && sessDelta >= 15) {
    out.push({
      area: 'ga4',
      severity: 'positive',
      title: `Sessions growing (${ga4.previous.sessions} → ${ga4.current.sessions}, +${Math.round(sessDelta)}%)`,
      detail: 'Total traffic grew more than 15% week over week.',
      action: 'Identify the growth channel and pages, then feed what works: internal links and fresh content on the pages pulling the growth.',
    })
  }
}

export function buildInsights(snapshot) {
  const out = []
  if (snapshot.gsc) gscInsights(snapshot.gsc, out)
  if (snapshot.ga4) ga4Insights(snapshot.ga4, out)
  strategyInsights(snapshot, out)

  const order = { negative: 0, warning: 1, opportunity: 2, positive: 3 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}
