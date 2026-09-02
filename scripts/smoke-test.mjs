#!/usr/bin/env node
/**
 * MintyFit smoke test — verifies the six critical flows against a STAGING
 * Supabase project. Uses the service role key (bypasses RLS for setup),
 * plus a dedicated test user for RLS-sensitive checks.
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *
 * Required env (reads .env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SMOKE_TEST_USER_ID     — a throwaway account on staging (created via the app)
 *
 * NEVER run this against production. It creates and deletes test rows.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Minimal .env.local reader (no dotenv dependency)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
try {
  const env = readFileSync(join(root, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  console.error('Could not read .env.local')
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_USER = process.env.SMOKE_TEST_USER_ID

if (!URL || !KEY || !TEST_USER) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SMOKE_TEST_USER_ID')
  process.exit(1)
}
if (!URL.includes('localhost') && !URL.includes('127.0.0.1') && !process.env.SMOKE_ALLOW_REMOTE) {
  console.error('Refusing to run against a non-local URL without SMOKE_ALLOW_REMOTE=1')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })

let passed = 0
let failed = 0
const ok = (name, cond, detail = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else { failed++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`) }
}

// ── 1. Schema sanity ─────────────────────────────────────────────────────────
console.log('\n1. Schema sanity')
{
  // managed_members must expose weight/height (the 0.1 regression)
  const { error } = await db.from('managed_members').select('id, weight, height').limit(1)
  ok('managed_members has weight/height columns', !error, error?.message)

  // profiles must expose weight/height
  const { error: pErr } = await db.from('profiles').select('id, weight, height').limit(1)
  ok('profiles has weight/height columns', !pErr, pErr?.message)

  // food_journal exists (GDPR regression)
  const { error: jErr } = await db.from('food_journal').select('id').limit(1)
  ok('food_journal table exists', !jErr, jErr?.message)

  // migration 058: usage RPC exists
  const { error: rpcErr } = await db.rpc('usage_check_and_increment', {
    p_user_id: TEST_USER, p_type: 'ai_calls', p_limit: -1,
  })
  ok('usage_check_and_increment RPC exists (migration 058)', !rpcErr, rpcErr?.message)

  // migration 059: search_vector exists
  const { error: ftsErr } = await db.from('recipes').select('id, search_vector').limit(1)
  ok('recipes.search_vector exists (migration 059)', !ftsErr, ftsErr?.message)
}

// ── 2. Family: managed members round-trip ────────────────────────────────────
console.log('\n2. Family / managed members')
{
  const { data: fam, error: fErr } = await db.from('families')
    .insert({ name: '__smoke__', created_by: TEST_USER }).select().single()
  ok('create family', !fErr, fErr?.message)

  if (fam) {
    await db.from('family_memberships').insert({ family_id: fam.id, profile_id: TEST_USER, role: 'admin' })
    const { data: kid, error: kErr } = await db.from('managed_members')
      .insert({ family_id: fam.id, managed_by: TEST_USER, name: 'Smoke Kid', gender: 'female', date_of_birth: '2018-01-01', weight: 25, height: 120 })
      .select().single()
    ok('create managed member', !kErr, kErr?.message)

    // The exact query the app pages run (regression: used to 400 on weight_kg)
    const { data: readBack, error: rErr } = await db.from('managed_members')
      .select('id, name, date_of_birth, weight, height, gender')
      .eq('family_id', fam.id)
    ok('managed member readable with weight/height', !rErr && readBack?.length === 1 && readBack[0].weight === 25, rErr?.message)

    await db.from('managed_members').delete().eq('family_id', fam.id)
    await db.from('family_memberships').delete().eq('family_id', fam.id)
    await db.from('families').delete().eq('id', fam.id)
  }
}

// ── 3. Calendar upsert path (0.5 regression) ─────────────────────────────────
console.log('\n3. Calendar save (select → insert/update)')
{
  const { data: recipe } = await db.from('recipes').select('id, title').limit(1).single()
  if (!recipe) {
    ok('calendar save (needs ≥1 recipe in DB)', false, 'no recipes found')
  } else {
    const dateStr = '2099-01-01'
    const row = {
      profile_id: TEST_USER, family_id: null, date_str: dateStr, meal_type: 'dinner',
      recipe_id: recipe.id, recipe_name: recipe.title, member_id: null, origin: 'planned',
    }
    const { error: iErr } = await db.from('calendar_entries').insert([row])
    ok('calendar insert', !iErr, iErr?.message)

    // Second save of same slot must not duplicate (select-then-update semantics)
    const { data: existing } = await db.from('calendar_entries')
      .select('id').eq('profile_id', TEST_USER).is('family_id', null)
      .eq('date_str', dateStr).eq('meal_type', 'dinner').eq('recipe_id', recipe.id).eq('origin', 'planned')
      .maybeSingle()
    ok('existing entry findable for update', !!existing?.id)

    await db.from('calendar_entries').delete().eq('profile_id', TEST_USER).eq('date_str', dateStr)
  }
}

// ── 4. Usage metering (atomic RPC) ───────────────────────────────────────────
console.log('\n4. Usage metering')
{
  // RPC enforces auth.uid() = p_user_id via RLS context — service role has no
  // auth.uid(), so this call should be rejected with our 'forbidden' payload.
  const { data, error } = await db.rpc('usage_check_and_increment', {
    p_user_id: TEST_USER, p_type: 'ai_calls', p_limit: 1,
  })
  const forbidden = data?.allowed === false && data?.error === 'forbidden'
  ok('RPC rejects non-owner metering (service role has no auth.uid)', forbidden || !!error)
}

// ── 5. Subscription tier vocabulary ──────────────────────────────────────────
console.log('\n5. Tier vocabulary')
{
  const { data: tiers } = await db.from('profiles').select('subscription_tier').limit(200)
  const bad = (tiers || []).filter(t => t.subscription_tier && !['free', 'pro', 'family', 'nutritionist'].includes(t.subscription_tier))
  ok('no invalid subscription_tier values (e.g. "paid")', bad.length === 0, bad.length ? `found: ${[...new Set(bad.map(t => t.subscription_tier))].join(', ')}` : '')
}

// ── 6. Recipes searchable ────────────────────────────────────────────────────
console.log('\n6. Recipe search')
{
  const { data, error } = await db.from('recipes')
    .select('id, title').eq('is_public', true)
    .textSearch('search_vector', 'chicken', { type: 'websearch', config: 'english' })
    .limit(5)
  ok('FTS query works', !error, error?.message)
  console.log(`     (${(data || []).length} public recipes match "chicken")`)
}

console.log(`\n${'─'.repeat(48)}\n${passed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)
