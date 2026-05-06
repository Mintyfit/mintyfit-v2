// ============================================================================
// Download Storage files by querying DB for image URLs (list API is broken)
// Blog images: from blog_posts.image_url
// Recipe/menu images: base64 data URIs already in DB dump — no download needed
// ============================================================================

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { createHash } from 'crypto';

const SUPABASE_URL = 'https://gqpdgopvzgtpupymxkva.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcGRnb3B2emd0cHVweW14a3ZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3MzIwNCwiZXhwIjoyMDg3MjQ5MjA0fQ.mmLMSMh_K7gqzW1XstHBbqIFL4dRYMXhWhVnkUowM4o';

const BASE_DIR = resolve('db-transfer/storage-files');
const API_HEADERS = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
};

async function queryTable(table, columns) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns.join(',')}&limit=1000`;
  const res = await fetch(url, { headers: API_HEADERS });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('=== Downloading Storage Images ===\n');
  mkdirSync(BASE_DIR, { recursive: true });

  const manifest = [];
  let totalFiles = 0;
  let totalSize = 0;
  let base64Count = 0;

  // ─── Blog Images ───────────────────────────────────────────────────────
  console.log('Blog post images...');
  const posts = await queryTable('blog_posts', ['id', 'slug', 'image_url']);
  for (const post of posts) {
    if (!post.image_url || !post.image_url.startsWith('http')) continue;
    const ext = extname(new URL(post.image_url).pathname) || '.jpg';
    const filename = `blog/${post.slug || post.id}${ext}`;
    const outPath = resolve(BASE_DIR, 'blog-images', filename);

    process.stdout.write(`  ${filename} ... `);
    try {
      const buf = await downloadUrl(post.image_url);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, buf);
      totalFiles++; totalSize += buf.length;
      console.log(`${(buf.length / 1024).toFixed(1)} KB`);
      manifest.push({ bucket: 'blog-images', path: filename, size: buf.length, hash: createHash('sha256').update(buf).digest('hex').slice(0, 16) });
    } catch (err) {
      console.log(`FAILED (${err.message})`);
    }
  }

  // ─── Recipe Images ─────────────────────────────────────────────────────
  console.log('\nRecipe images...');
  const recipes = await queryTable('recipes', ['id', 'slug', 'image_url', 'image_thumb_url']);
  for (const r of recipes) {
    for (const field of ['image_url', 'image_thumb_url']) {
      const url = r[field];
      if (!url) continue;
      if (url.startsWith('data:image')) { base64Count++; continue; }
      if (!url.startsWith('http')) continue;

      const ext = extname(new URL(url).pathname) || '.jpg';
      const filename = `recipes/${r.slug || r.id}-${field}${ext}`;
      const outPath = resolve(BASE_DIR, 'recipe-images', filename);

      process.stdout.write(`  ${filename} ... `);
      try {
        const buf = await downloadUrl(url);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, buf);
        totalFiles++; totalSize += buf.length;
        console.log(`${(buf.length / 1024).toFixed(1)} KB`);
        manifest.push({ bucket: 'recipe-images', path: filename, size: buf.length, hash: createHash('sha256').update(buf).digest('hex').slice(0, 16) });
      } catch (err) {
        console.log(`FAILED (${err.message})`);
      }
    }
  }

  // ─── Menu Images ───────────────────────────────────────────────────────
  console.log('\nMenu images...');
  const menus = await queryTable('menus', ['id', 'slug', 'image_url', 'image_thumb_url']);
  for (const m of menus) {
    for (const field of ['image_url', 'image_thumb_url']) {
      const url = m[field];
      if (!url) continue;
      if (url.startsWith('data:image')) { base64Count++; continue; }
      if (!url.startsWith('http')) continue;

      const ext = extname(new URL(url).pathname) || '.jpg';
      const filename = `menus/${m.slug || m.id}-${field}${ext}`;
      const outPath = resolve(BASE_DIR, 'recipe-images', filename);

      process.stdout.write(`  ${filename} ... `);
      try {
        const buf = await downloadUrl(url);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, buf);
        totalFiles++; totalSize += buf.length;
        console.log(`${(buf.length / 1024).toFixed(1)} KB`);
        manifest.push({ bucket: 'recipe-images', path: filename, size: buf.length, hash: createHash('sha256').update(buf).digest('hex').slice(0, 16) });
      } catch (err) {
        console.log(`FAILED (${err.message})`);
      }
    }
  }

  // ─── Manifest + Upload Script ──────────────────────────────────────────
  writeFileSync(resolve(BASE_DIR, '_manifest.json'), JSON.stringify({
    totalFiles, totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    base64InDB: base64Count,
    note: 'Recipe/menu images use base64 data URIs stored in DB — already in 02-data.sql',
    manifest,
  }, null, 2), 'utf-8');

  const uploadJs = `// Upload Storage files to TARGET Supabase. Edit TARGET_URL + TARGET_KEY, create buckets, then run.
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_URL = 'https://YOUR-PROJECT.supabase.co';
const TARGET_KEY = 'YOUR-SERVICE-ROLE-KEY';
const manifest = ${JSON.stringify(manifest)};
async function up(b, p, lp) {
  const buf = readFileSync(lp);
  const enc = p.split('/').map(encodeURIComponent).join('/');
  const r = await fetch(\`\${TARGET_URL}/storage/v1/object/\${b}/\${enc}\`,{method:'POST',headers:{Authorization:\`Bearer \${TARGET_KEY}\`,apikey:TARGET_KEY,'x-upsert':'true'},body:buf});
  if(!r.ok) throw new Error(\`\${r.status}\`);
}
let ok=0,fail=0;
for(const f of manifest){const lp=resolve(__dirname,f.bucket,f.path);if(!existsSync(lp)){console.log('MISSING: '+f.path);fail++;continue;}try{await up(f.bucket,f.path,lp);console.log('OK: '+f.path);ok++;}catch(e){console.log('FAIL: '+f.path+' '+e.message);fail++;}}
console.log(\`Done: \${ok} ok, \${fail} failed\`);
`;

  writeFileSync(resolve(BASE_DIR, '_upload.mjs'), uploadJs, 'utf-8');

  console.log(`\n=== Done ===`);
  console.log(`Files downloaded: ${totalFiles} (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Base64 in DB:     ${base64Count} (already in 02-data.sql)`);
  console.log(`Saved to: ${BASE_DIR}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
