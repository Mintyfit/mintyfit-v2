// One-shot: re-upload blog images and rewrite blog_posts.image_url to the slug-based paths.
//
// Background: blog_posts.image_url rows point at timestamp-named files
// (e.g. .../blog-images/blog/1772031274905.jpg) that do not exist in storage.
// db-transfer/storage-files/blog-images/blog/<slug>.<ext> has the actual files
// renamed by slug. This script uploads them and updates the DB to match.
//
// Usage: node scripts/fix-blog-images.mjs           # dry-run, shows what would change
//        node scripts/fix-blog-images.mjs --apply   # actually uploads + updates DB

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SRC_DIR = resolve(ROOT, 'db-transfer/storage-files/blog-images/blog')
const BUCKET = 'blog-images'
const APPLY = process.argv.includes('--apply')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from .env.local).')
  process.exit(1)
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

// slug -> { storagePath, localPath, contentType }
const filesBySlug = {}
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
if (!existsSync(SRC_DIR)) {
  console.error('Source dir missing:', SRC_DIR)
  process.exit(1)
}
for (const name of readdirSync(SRC_DIR)) {
  const ext = extname(name).slice(1).toLowerCase()
  if (!MIME[ext]) continue
  const slug = basename(name, extname(name))
  filesBySlug[slug] = {
    storagePath: `blog/${name}`,
    localPath: resolve(SRC_DIR, name),
    contentType: MIME[ext],
  }
}
console.log(`Found ${Object.keys(filesBySlug).length} local blog images.`)

const { data: posts, error } = await supabase
  .from('blog_posts')
  .select('id, slug, title, image_url')
if (error) { console.error(error); process.exit(1) }

console.log(`Loaded ${posts.length} blog posts.`)

const publicBase = `${URL}/storage/v1/object/public/${BUCKET}/`
let matched = 0, uploaded = 0, updated = 0, skipped = 0, missing = 0

for (const post of posts) {
  const f = filesBySlug[post.slug]
  if (!f) {
    console.log(`  · no local image for slug: ${post.slug}`)
    missing++
    continue
  }
  const desiredUrl = publicBase + f.storagePath
  if (post.image_url === desiredUrl) {
    skipped++
    continue
  }
  matched++
  console.log(`[${post.slug}]`)
  console.log(`   old: ${post.image_url || '(null)'}`)
  console.log(`   new: ${desiredUrl}`)
  if (!APPLY) continue

  const buf = readFileSync(f.localPath)
  const up = await supabase.storage.from(BUCKET).upload(f.storagePath, buf, {
    contentType: f.contentType,
    upsert: true,
  })
  if (up.error) { console.error('   upload failed:', up.error.message); continue }
  uploaded++

  const upd = await supabase.from('blog_posts').update({ image_url: desiredUrl }).eq('id', post.id)
  if (upd.error) { console.error('   db update failed:', upd.error.message); continue }
  updated++
}

console.log('\n--- summary ---')
console.log(`matched (would change): ${matched}`)
console.log(`skipped (already correct): ${skipped}`)
console.log(`missing local file: ${missing}`)
if (APPLY) {
  console.log(`uploaded: ${uploaded}`)
  console.log(`db updated: ${updated}`)
} else {
  console.log('\nDry-run only. Re-run with --apply to upload + update.')
}
