/**
 * Number audit for the LLM narrative (weekly report). The narrative is a
 * phrasing layer on top of real GSC/GA4/DB numbers — it must not invent,
 * derive or re-combine figures. This module enforces that: every "risky"
 * number in the narrative must appear in the real input sources (digest JSON,
 * rules-engine insights, fixed system context). Any mismatch discards the
 * narrative and the report ships rules-only.
 *
 * Dates (17.08.2026, 2026-08-17) and markdown list markers ("1. ") are not
 * treated as numbers.
 */

/** Extract numeric literals from text (both narrative and allowed sources). */
export function extractNumbers(text) {
  // Strip dates first so 17.08.2026 / 2026-08-17 are not parsed as numbers.
  let t = text.replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
  // Strip markdown ordered-list markers at line starts ("1. ", "12. ").
  t = t.replace(/^\s{0,3}\d{1,2}\.\s+/gm, ' ')
  const re = /[+-]?\d{1,3}(?: \d{3})+(?:[,.]\d{1,2})?|[+-]?\d+[,.]\d{1,2}|[+-]?\d+/g
  const out = []
  for (const m of t.matchAll(re)) {
    const raw = m[0]
    const value = Number(raw.replace(/ /g, '').replace(',', '.').replace(/^\+/, ''))
    if (!Number.isFinite(value)) continue
    const hasDecimals = /[,.]\d/.test(raw)
    const after = t.slice(m.index + raw.length, m.index + raw.length + 4)
    const hasUnit = /^\s*(%|€|\$|eur|usd)/i.test(after)
    // Only audit numbers that can distort a decision: decimals, unit-bound
    // values (%, €, $) and anything >= 10. Bare small integers ("3 points",
    // "top 5") are harmless prose and would false-positive.
    const risky = hasDecimals || hasUnit || Math.abs(value) >= 10
    out.push({ value, raw, risky })
  }
  return out
}

/** All numeric values present in the allowed sources. */
export function allowedNumbers(sources) {
  const vals = []
  for (const s of sources) for (const n of extractNumbers(s)) vals.push(n.value)
  return vals
}

/** Tolerant match: absorbs 1-decimal rounding in the digest (41.7 ~ "42"). */
const matches = (n, v) => Math.abs(n - v) <= Math.max(0.51, Math.abs(v) * 0.011)

/**
 * Returns the narrative's number literals (in original form) that do not
 * appear in any allowed source. Empty array = audit passed.
 */
export function auditNarrativeNumbers(narrative, allowedSources) {
  const allowed = allowedNumbers(allowedSources)
  const violations = []
  for (const n of extractNumbers(narrative)) {
    if (!n.risky) continue
    if (!allowed.some((v) => matches(n.value, v))) violations.push(n.raw)
  }
  return [...new Set(violations)]
}
