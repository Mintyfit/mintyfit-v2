#!/usr/bin/env node
/**
 * Captures App Store screenshots (6.7"/6.9" iPhone class: 1290x2796) of the
 * live site — the iOS shell renders the web app 1:1, so a faithful iPhone
 * viewport capture IS the app screenshot. Uses playwright-core + the existing
 * local Chromium (no browser download).
 *
 * Authed pages are reached via the reviewer session link (regenerate with
 * scripts/prepare-reviewer-account.mjs --link-only).
 *
 * Usage:
 *   node scripts/capture-app-store-screenshots.mjs <handle-session-url> [outDir]
 * Default outDir: D:\WORKS\Minty\iOS\store-assets\screenshots
 */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'fs'
import { join } from 'path'

const CHROME = join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1243', 'chrome-win64', 'chrome.exe')
const OUT = process.argv[3] || 'D:\\WORKS\\Minty\\iOS\\store-assets\\screenshots'
const SESSION_LINK = process.argv[2]

if (!SESSION_LINK) { console.error('Usage: node scripts/capture-app-store-screenshots.mjs <handle-session-url> [outDir]'); process.exit(1) }

const BASE = 'https://mintyfit.com'
// Order matters for the listing: hero-first.
const SHOTS = [
  { name: '1-planner-week.png', path: '/plan', auth: true, wait: 4000 },
  { name: '2-recipe-detail.png', path: '/recipes', auth: true, wait: 3500, thenClickFirstCard: true },
  { name: '3-statistics.png', path: '/statistics', auth: true, wait: 4500 },
  { name: '4-my-family.png', path: '/my-family', auth: true, wait: 3500 },
  { name: '5-landing.png', path: '/', auth: false, wait: 3000 },
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  locale: 'en-US',
})
const page = await ctx.newPage()
page.setDefaultTimeout(60000)

// Sign in via the reviewer link (server sets the session cookies).
await page.goto(SESSION_LINK, { waitUntil: 'domcontentloaded' })
await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 60000 }).catch(() => {})
await page.waitForTimeout(2000)

for (const shot of SHOTS) {
  try {
    await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    if (shot.thenClickFirstCard) {
      // Open the first public recipe card for a real recipe-detail shot.
      const link = page.locator('a[href^="/recipes/"]:not([href="/recipes/generate"])').first()
      await link.click({ timeout: 15000 }).catch(() => {})
      await page.waitForLoadState('networkidle').catch(() => {})
    }
    await page.waitForTimeout(shot.wait)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: join(OUT, shot.name) })
    console.log('saved', shot.name, '-', page.url())
  } catch (e) {
    console.error('FAILED', shot.name, e.message)
  }
}

await browser.close()
console.log('done ->', OUT)
