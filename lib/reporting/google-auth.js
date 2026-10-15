/**
 * Google API auth for the weekly SEO report: mints OAuth access tokens from
 * a service account. Two credential sources:
 *
 *   1. GCP_SERVICE_ACCOUNT_JSON  — the full service-account JSON as an env
 *      var (Vercel production; never commit the key file).
 *   2. GOOGLE_APPLICATION_CREDENTIALS / .secrets/gcp-analytics.json — local
 *      key file for manual runs.
 *
 * The service account needs: GA4 Viewer + Search Console user access.
 * See SEO-STRATEGY.md §7.
 */

import { existsSync } from 'node:fs'
import { GoogleAuth } from 'google-auth-library'

const DEFAULT_KEY_FILE = '.secrets/gcp-analytics.json'

export async function getGoogleAccessToken(scopes) {
  const jsonEnv = process.env.GCP_SERVICE_ACCOUNT_JSON?.trim()
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? DEFAULT_KEY_FILE

  let auth
  if (jsonEnv) {
    let credentials
    try {
      credentials = JSON.parse(jsonEnv)
    } catch {
      throw new Error('GCP_SERVICE_ACCOUNT_JSON is not valid JSON')
    }
    auth = new GoogleAuth({ credentials, scopes })
  } else {
    if (!existsSync(keyFile)) {
      throw new Error(
        `Service-account key not found at ${keyFile} and GCP_SERVICE_ACCOUNT_JSON is not set. ` +
          'See SEO-STRATEGY.md §7 for setup.',
      )
    }
    auth = new GoogleAuth({ keyFile, scopes })
  }

  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) throw new Error('Failed to mint an access token from the service-account key')
  return token.token
}

export async function postJson(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${url} -> ${res.status}: ${text.slice(0, 400)}`)
  }
  return await res.json()
}

/* ---------- shared date-range convention (GA4/GSC data lags ~2 days) ---------- */

export function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

/** Last 7 days (ending 2 days ago) vs the 7 days before that. */
export function weeklyPeriod(now = new Date()) {
  const end = new Date(now)
  end.setDate(end.getDate() - 2)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - 6)
  return {
    start: isoDate(start),
    end: isoDate(end),
    prevStart: isoDate(prevStart),
    prevEnd: isoDate(prevEnd),
  }
}
