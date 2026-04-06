import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const IDEOGRAM_PROXY_URL = '/api/ideogram';
const IMAGE_PROXY_URL    = '/api/proxy-image';

// Simple in-memory + localStorage cache keyed by recipe title
const _memCache = {};

function _getCacheKey(title) {
  return title.toLowerCase().trim().replace(/\s+/g, ' ');
}

function _readCache() {
  try {
    return JSON.parse(localStorage.getItem('mn-image-cache') || '{}');
  } catch {
    return {};
  }
}

function _writeCache(cache) {
  try {
    localStorage.setItem('mn-image-cache', JSON.stringify(cache));
  } catch { /* storage quota */ }
}

function _buildPrompt(recipe) {
  const desc = recipe.description ? `, ${recipe.description}` : '';
  return (
    `Professional food photography of ${recipe.title}${desc}. ` +
    'Freshly plated on a clean white ceramic dish, soft studio lighting with ' +
    'gentle shadows, shallow depth of field, bokeh background, appetizing colors, ' +
    'garnished with fresh herbs, rustic oak surface, linen napkin, ' +
    'high-resolution editorial quality, ultra-sharp focus on the food, ' +
    'cookbook cover style, photorealistic'
  );
}

// Retry a fetch up to `retries` times on 5xx or network failure.
async function _fetchWithRetry(url, options, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Generate a professional food photo via Ideogram v3 (proxied server-side).
 * Returns null on failure so the caller can use generateSvgFallback() instead.
 *
 * @param {object}   recipe     - { title, description, steps }
 * @param {*}        _ignored   - formerly apiKeyOverride, now unused
 * @param {function} [onError]  - error callback(message)
 * @param {boolean}  [forceNew] - bypass cache and generate a fresh image
 * @returns {Promise<string|null>}
 */
export async function generateRecipeImage(recipe, _ignored, onError, forceNew = false) {
  const cacheKey = _getCacheKey(recipe.title);

  if (!forceNew) {
    if (_memCache[cacheKey]) return _memCache[cacheKey];
    const stored = _readCache();
    if (stored[cacheKey]) {
      _memCache[cacheKey] = stored[cacheKey];
      return stored[cacheKey];
    }
  }

  const prompt = _buildPrompt(recipe);

  console.log('[Ideogram] Generated prompt:', prompt);

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.error('[Ideogram] Invalid prompt - aborting image gen', { prompt });
    return null;
  }

  try {
    const response = await _fetchWithRetry(
      IDEOGRAM_PROXY_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'V_3',
          aspect_ratio: '16x9',
          style_type: 'REALISTIC',
          magic_prompt_option: 'AUTO',
          negative_prompt: 'blurry, low quality, distorted, cartoon, illustration, drawing, text, watermark',
        }),
      },
      2, // up to 2 retries
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        onError?.('Image generation failed: invalid API key (401)');
      } else if (response.status === 429) {
        onError?.('Image generation rate-limited (429) — try again in a moment');
      } else {
        onError?.(`Image generation failed (${response.status}): ${errorText.slice(0, 120)}`);
      }
      return null;
    }

    const result = await response.json();
    const url = result?.data?.[0]?.url || result?.images?.[0]?.url;

    if (!url) {
      onError?.('Image generation returned no URL — unexpected API response');
      return null;
    }

    // Cache the result
    _memCache[cacheKey] = url;
    const cache = _readCache();
    cache[cacheKey] = url;
    _writeCache(cache);

    return url;
  } catch (error) {
    onError?.(`Image generation error: ${error?.message || 'network failure'}`);
    return null;
  }
}

/**
 * Fetch a generated image via server proxy, resize it to two sizes using
 * the Canvas API, upload both to Supabase Storage, and return permanent URLs.
 *
 * Sizes produced (matched to recipe detail page viewport, largest view ~644×362):
 *   detail  640 × 360 px  JPEG q=0.85  (~40–70 KB)
 *   thumb   320 × 180 px  JPEG q=0.80  (~15–25 KB)
 *
 * Falls back to a data URL if Supabase storage upload fails, so callers
 * always receive a properly-sized image rather than the raw 1024×768 source.
 *
 * @param {string} imageUrl  - CDN URL returned by the image provider
 * @param {string} pathKey   - Unique path prefix (e.g. "1234567890")
 * @returns {Promise<{detailUrl: string|null, thumbUrl: string|null}>}
 */
export async function resizeAndUploadImages(imageUrl, pathKey) {
  try {
    // Fetch through server proxy to avoid CORS taint on Canvas
    const proxiedUrl = `${IMAGE_PROXY_URL}?url=${encodeURIComponent(imageUrl)}`;
    const resp = await fetch(proxiedUrl);
    if (!resp.ok) return { detailUrl: null, thumbUrl: null };
    const blob = await resp.blob();

    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      return { detailUrl: null, thumbUrl: null };
    }

    // Sizes matched to recipe detail page viewport:
    // largest display = left column (~644px) × maxHeight 400px → 640×360 at 16:9
    const sizes = [
      { w: 640, h: 360, suffix: 'detail', quality: 0.85 },
      { w: 320, h: 180, suffix: 'thumb',  quality: 0.80 },
    ];

    const urls = {};
    const dataUrls = {};
    for (const { w, h, suffix, quality } of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      // Cover crop — center the source image
      const srcAspect = bitmap.width / bitmap.height;
      const dstAspect = w / h;
      let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
      if (srcAspect > dstAspect) {
        sw = bitmap.height * dstAspect;
        sx = (bitmap.width - sw) / 2;
      } else {
        sh = bitmap.width / dstAspect;
        sy = (bitmap.height - sh) / 2;
      }
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);

      const resizedBlob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (!resizedBlob) continue;

      // Keep data URL as fallback if Supabase storage is unavailable
      dataUrls[suffix] = canvas.toDataURL('image/jpeg', quality);

      const storagePath = `${pathKey}-${suffix}.jpg`;
      const { error } = await supabase.storage
        .from('recipe-images')
        .upload(storagePath, resizedBlob, { contentType: 'image/jpeg', upsert: true });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(storagePath);
        urls[suffix] = urlData.publicUrl;
      }
    }

    // Prefer permanent Supabase URL; fall back to data URL to avoid raw 1312×736 Ideogram URLs
    return {
      detailUrl: urls.detail || dataUrls.detail || null,
      thumbUrl:  urls.thumb  || dataUrls.thumb  || null,
    };
  } catch (e) {
    console.warn('resizeAndUploadImages failed:', e.message);
    return { detailUrl: null, thumbUrl: null };
  }
}

/**
 * Generate an SVG placeholder image for a recipe.
 * Used as fallback when image generation is unavailable.
 *
 * @param {object} recipe  - { title, description, steps }
 * @returns {string}  data URI
 */
export function generateSvgFallback(recipe) {
  const svgColors = ['#C8E8B8', '#D4EDCE', '#FECACA', '#BBF7D0', '#BFDBFE', '#DDD6FE'];
  const bg = svgColors[Math.abs(recipe.title?.length || 0) % svgColors.length];

  const EMOJIS = {
    chicken: '🍗', beef: '🥩', fish: '🐟', salmon: '🐟', tuna: '🐟',
    pasta: '🍝', rice: '🍚', salad: '🥗', soup: '🍲', egg: '🍳',
    cake: '🎂', pizza: '🍕', burger: '🍔', curry: '🍛', steak: '🥩',
    bread: '🍞', vegetable: '🥦', mushroom: '🍄', shrimp: '🍤',
    noodle: '🍜', wrap: '🌯', taco: '🌮', sushi: '🍱',
  };

  const titleLower = (recipe.title || '').toLowerCase();
  let emoji = '🍽';
  for (const [key, val] of Object.entries(EMOJIS)) {
    if (titleLower.includes(key)) { emoji = val; break; }
  }

  const displayTitle = (recipe.title || 'Recipe').length > 28
    ? (recipe.title || '').substring(0, 28) + '…'
    : (recipe.title || 'Recipe');

  const mainIng = recipe.steps?.[0]?.ingredients?.[0]?.name
    || recipe.description?.split(' ').slice(0, 4).join(' ')
    || recipe.title;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="384" viewBox="0 0 512 384">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${bg}cc"/>
    </radialGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/></filter>
  </defs>
  <rect width="512" height="384" fill="url(#bg)"/>
  <circle cx="256" cy="175" r="110" fill="white" fill-opacity="0.4" filter="url(#shadow)"/>
  <text x="256" y="210" text-anchor="middle" font-size="90">${emoji}</text>
  <text x="256" y="290" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="#374151">${displayTitle}</text>
  <text x="256" y="318" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#6B7280">${mainIng}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
