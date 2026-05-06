// Upload Storage files to TARGET Supabase. Edit TARGET_URL + TARGET_KEY, create buckets, then run.
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_URL = 'https://YOUR-PROJECT.supabase.co';
const TARGET_KEY = 'YOUR-SERVICE-ROLE-KEY';
const manifest = [{"bucket":"blog-images","path":"blog/why-healthy-eating-might-be-backfiring-for-women-over-40.jpg","size":61898,"hash":"76cd127f7ca986dc"},{"bucket":"blog-images","path":"blog/why-healthy-foods-can-cause-bloating.jpg","size":101067,"hash":"1e900fdb7a71522d"},{"bucket":"blog-images","path":"blog/how-stress-might-be-the-hidden-cause-of-your-weight-gain.jpeg","size":118569,"hash":"b608279d04ff7002"},{"bucket":"blog-images","path":"blog/what-are-fodmaps.jpeg","size":204429,"hash":"edfba019d8f56929"},{"bucket":"blog-images","path":"blog/i-took-10-000iu-of-vitamin-d3-daily-heres-what-went-wrong.jpg","size":58942,"hash":"a434d6a0d55e338b"},{"bucket":"blog-images","path":"blog/water-calculator.jpg","size":58005,"hash":"35c06262ecfd2fec"},{"bucket":"blog-images","path":"blog/should-you-supplement-for-magnesium.jpg","size":25198,"hash":"7fd13d8f971aec56"},{"bucket":"blog-images","path":"blog/comprehensive-vitamin-d3-calculator.png","size":96039,"hash":"33ae2d5bba7d8231"},{"bucket":"blog-images","path":"blog/chronic-low-grade-inflammation.jpeg","size":101674,"hash":"e0661dada0118d2a"},{"bucket":"recipe-images","path":"menus/-mediterranean-meal-plan-ef0dc3-image_url.jpg","size":65104,"hash":"5e0bc426468d0de4"},{"bucket":"recipe-images","path":"menus/-mediterranean-meal-plan-ef0dc3-image_thumb_url.jpg","size":18067,"hash":"6345e4f9dddd375e"}];
async function up(b, p, lp) {
  const buf = readFileSync(lp);
  const enc = p.split('/').map(encodeURIComponent).join('/');
  const r = await fetch(`${TARGET_URL}/storage/v1/object/${b}/${enc}`,{method:'POST',headers:{Authorization:`Bearer ${TARGET_KEY}`,apikey:TARGET_KEY,'x-upsert':'true'},body:buf});
  if(!r.ok) throw new Error(`${r.status}`);
}
let ok=0,fail=0;
for(const f of manifest){const lp=resolve(__dirname,f.bucket,f.path);if(!existsSync(lp)){console.log('MISSING: '+f.path);fail++;continue;}try{await up(f.bucket,f.path,lp);console.log('OK: '+f.path);ok++;}catch(e){console.log('FAIL: '+f.path+' '+e.message);fail++;}}
console.log(`Done: ${ok} ok, ${fail} failed`);
