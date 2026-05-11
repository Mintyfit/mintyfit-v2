/**
 * One-shot cleanup: strip trailing -<hex> suffixes from recipe slugs.
 *
 * Some legacy rows have slugs like "butter-chicken-...-f11a6e". This script
 * rewrites them to the clean prefix, falling back to "-2", "-3", etc. on
 * collisions (same convention as lib/utils/slugify.js).
 *
 * Run once:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/clean-recipe-slugs.mjs
 *
 * Safe to re-run — only touches rows whose slug still matches the legacy pattern.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key)

const HEX_SUFFIX_RE = /-[0-9a-f]{4,12}$/i

async function uniqueSlug(base, currentId) {
  let candidate = base
  let i = 2
  while (true) {
    const { data } = await supabase
      .from('recipes')
      .select('id')
      .eq('slug', candidate)
      .neq('id', currentId)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i++}`
    if (i > 100) return `${base}-${Date.now()}`
  }
}

const { data: rows, error } = await supabase
  .from('recipes')
  .select('id, slug')
  .not('slug', 'is', null)

if (error) { console.error(error); process.exit(1) }

let touched = 0
for (const r of rows) {
  if (!HEX_SUFFIX_RE.test(r.slug)) continue
  const cleanBase = r.slug.replace(HEX_SUFFIX_RE, '')
  if (!cleanBase) continue
  const newSlug = await uniqueSlug(cleanBase, r.id)
  if (newSlug === r.slug) continue
  const { error: upErr } = await supabase
    .from('recipes')
    .update({ slug: newSlug })
    .eq('id', r.id)
  if (upErr) { console.error('update failed for', r.id, upErr); continue }
  console.log(`${r.slug}  →  ${newSlug}`)
  touched++
}
console.log(`\nDone. Cleaned ${touched} slug${touched === 1 ? '' : 's'}.`)
