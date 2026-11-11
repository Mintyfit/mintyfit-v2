#!/usr/bin/env node
/**
 * Prepares the App Store reviewer demo account on PRODUCTION:
 *   - demo auth user (email + password, email confirmed — password login is
 *     the backup path documented in the App Review notes)
 *   - profile (family tier, onboarding done) + family + 2 managed kids
 *   - 5 weight log entries (statistics sparkline)
 *   - 7 days x 3 meals of calendar entries around today, personal_nutrition
 *     computed with the canonical computeMealBudget (never duplicated here —
 *     imported from lib/nutrition/mealBudget.js)
 *   - prints a fresh /auth/handle-session?t=... reviewer sign-in link
 *     (tokens age — regenerate right before submitting with --link-only)
 *
 * Usage:
 *   npx tsx --tsconfig jsconfig.json scripts/prepare-reviewer-account.mjs --password <strong-password>
 *   npx tsx --tsconfig jsconfig.json scripts/prepare-reviewer-account.mjs --link-only
 *
 * Env: reads .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 * Optional: REVIEWER_EMAIL (default demo@mintyfit.com), REVIEWER_ACCOUNT_PASSWORD
 * (alternative to --password).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { computeMealBudget } from '../lib/nutrition/mealBudget.js'
import { enrichMember } from '../lib/member/enrichMember.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
try {
  const env = readFileSync(join(root, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch { /* fall through to env check */ }

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.env.REVIEWER_EMAIL || 'demo@mintyfit.com'
const args = process.argv.slice(2)
const LINK_ONLY = args.includes('--link-only')
const pwIdx = args.indexOf('--password')
const PASSWORD = (pwIdx >= 0 ? args[pwIdx + 1] : null) || process.env.REVIEWER_ACCOUNT_PASSWORD

if (!URL || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local'); process.exit(1) }
if (!PASSWORD) { console.error('Missing password: pass --password <pw> or set REVIEWER_ACCOUNT_PASSWORD in .env.local'); process.exit(1) }

const admin = createClient(URL, KEY, { auth: { persistSession: false } })

const ADULT = { first_name: 'Alex', display_name: 'Alex', full_name: 'Alex Demo', gender: 'male', age: 38, date_of_birth: '1988-03-15', height: 178, weight: 78.5 }
const KIDS = [
  { name: 'Emma', gender: 'female', date_of_birth: '2018-06-20', height: 128, weight: 27 },
  { name: 'Liam', gender: 'male', date_of_birth: '2021-11-05', height: 110, weight: 19 },
]
const WEIGHT_HISTORY = [80.2, 79.6, 79.1, 78.8, 78.5] // weekly, oldest → newest

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function ageFromDob(dob) {
  const b = new Date(dob), now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
  return age
}

async function findUserByEmail(email) {
  // listUsers is paged; the demo mailbox is findable within the first pages.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

async function ensureUser() {
  const existing = await findUserByEmail(EMAIL)
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADULT.full_name },
    })
    if (error) throw error
    console.log(`user exists: ${data.user.id} (password refreshed)`)
    return data.user
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADULT.full_name },
  })
  if (error) throw error
  console.log(`user created: ${data.user.id}`)
  return data.user
}

async function wipeDemoData(profileId) {
  const { data: ms } = await admin.from('family_memberships').select('family_id').eq('profile_id', profileId)
  const familyIds = (ms || []).map(m => m.family_id)
  await admin.from('calendar_entries').delete().eq('profile_id', profileId)
  await admin.from('weight_logs').delete().eq('profile_id', profileId)
  for (const fid of familyIds) {
    await admin.from('calendar_entries').delete().eq('family_id', fid)
    await admin.from('managed_members').delete().eq('family_id', fid)
    await admin.from('family_memberships').delete().eq('family_id', fid)
    await admin.from('families').delete().eq('id', fid)
  }
  if (familyIds.length) console.log(`wiped ${familyIds.length} prior demo family/families`)
}

async function populate(user) {
  const profileId = user.id

  await admin.from('profiles').upsert({
    id: profileId,
    email: EMAIL,
    full_name: ADULT.full_name,
    first_name: ADULT.first_name,
    display_name: ADULT.display_name,
    gender: ADULT.gender,
    age: ADULT.age,
    date_of_birth: ADULT.date_of_birth,
    height: ADULT.height,
    weight: ADULT.weight,
    subscription_tier: 'family',
    onboarding_pending: false,
  }, { onConflict: 'id' })

  const { data: family, error: famErr } = await admin.from('families')
    .insert({ name: 'Demo Family', created_by: profileId }).select('id').single()
  if (famErr) throw famErr
  await admin.from('family_memberships').insert({ family_id: family.id, profile_id: profileId, role: 'admin' })

  const kidRows = []
  for (const k of KIDS) {
    const { data, error } = await admin.from('managed_members')
      .insert({ family_id: family.id, managed_by: profileId, name: k.name, gender: k.gender, date_of_birth: k.date_of_birth, height: k.height, weight: k.weight })
      .select('id, name, gender, date_of_birth, height, weight').single()
    if (error) throw error
    kidRows.push(data)
  }

  for (let i = 0; i < WEIGHT_HISTORY.length; i++) {
    const d = new Date(); d.setDate(d.getDate() - 7 * (WEIGHT_HISTORY.length - 1 - i))
    await admin.from('weight_logs').upsert(
      { profile_id: profileId, weight: WEIGHT_HISTORY[i], logged_date: dateKey(d) },
      { onConflict: 'profile_id,logged_date' }
    )
  }

  // Enriched eaters — the same shape the planner passes to computeMealBudget.
  const eaters = [
    enrichMember({ id: profileId, ...ADULT, type: 'linked' }),
    ...kidRows.map(k => enrichMember({ ...k, age: ageFromDob(k.date_of_birth), display_name: k.name, type: 'managed' })),
  ]
  console.log('eaters:', eaters.map(e => `${e.display_name} ~${e.baseDailyCalories}kcal`).join(', '))

  // Public recipe pool with usable nutrition, split by meal slot.
  const { data: recipes, error: rErr } = await admin
    .from('recipes').select('id, title, meal_type, nutrition').eq('is_public', true).limit(400)
  if (rErr) throw rErr
  const usable = (recipes || []).filter(r => r.nutrition?.totals?.energy_kcal > 0)
  const slotOf = r => Array.isArray(r.meal_type) ? r.meal_type : [r.meal_type]
  const pools = {
    breakfast: usable.filter(r => slotOf(r).includes('breakfast')),
    lunch: usable.filter(r => slotOf(r).includes('lunch') || slotOf(r).includes('dinner')),
    dinner: usable.filter(r => slotOf(r).includes('dinner') || slotOf(r).includes('lunch')),
  }
  for (const [slot, pool] of Object.entries(pools)) {
    if (!pool.length) throw new Error(`No public recipes with nutrition for ${slot}`)
    console.log(`recipe pool ${slot}: ${pool.length}`)
  }

  // 7 days around today: 4 back + today + 2 ahead (Statistics reads trailing 7d).
  let inserted = 0, skipped = 0
  const pick = { breakfast: 0, lunch: 0, dinner: 0 }
  for (let offset = -4; offset <= 2; offset++) {
    const d = new Date(); d.setDate(d.getDate() + offset)
    const dk = dateKey(d)
    for (const meal of ['breakfast', 'lunch', 'dinner']) {
      const pool = pools[meal]
      const recipe = pool[pick[meal]++ % pool.length]
      const { data: existing } = await admin.from('calendar_entries')
        .select('id').eq('family_id', family.id).eq('date_str', dk).eq('meal_type', meal)
        .eq('recipe_id', recipe.id).eq('origin', 'planned').maybeSingle()
      if (existing?.id) { skipped++; continue }
      const personalNutrition = computeMealBudget(eaters, recipe.nutrition.totals, meal, null, 3).personalNutrition
      const { error } = await admin.from('calendar_entries').insert({
        profile_id: profileId,
        family_id: family.id,
        date_str: dk,
        meal_type: meal,
        recipe_id: recipe.id,
        recipe_name: recipe.title || '',
        member_id: null,
        consumer_member_ids: eaters.map(e => e.id),
        personal_nutrition: personalNutrition || null,
        origin: 'planned',
      })
      if (error) throw error
      inserted++
    }
  }
  console.log(`calendar: ${inserted} inserted, ${skipped} already present`)
}

async function printSessionLink() {
  const anon = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (error) { console.error('sign-in for session link failed:', error.message); process.exit(1) }
  const payload = Buffer.from(JSON.stringify({
    at: data.session.access_token,
    rt: data.session.refresh_token,
    ts: Date.now(),
  }), 'utf8').toString('base64url')
  console.log('\n=== REVIEWER SIGN-IN LINK (valid ~7 days, regenerate before submitting) ===')
  console.log(`https://mintyfit.com/auth/handle-session?t=${payload}`)
  console.log(`\nbackup credentials: ${EMAIL} / ${PASSWORD}`)
}

const user = await ensureUser()
if (!LINK_ONLY) {
  await wipeDemoData(user.id)
  await populate(user)
}
await printSessionLink()
