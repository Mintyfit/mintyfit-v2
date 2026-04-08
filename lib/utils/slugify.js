/**
 * Convert a string to a URL-safe slug.
 * Used for recipes, menus, blog posts.
 */
export function slugify(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')                    // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')     // strip accents
    .replace(/[^a-z0-9\s-]/g, '')       // only alphanumeric, spaces, hyphens
    .trim()
    .replace(/\s+/g, '-')               // spaces → hyphens
    .replace(/-+/g, '-')                // collapse multiple hyphens
    .slice(0, 80)                       // max length
}

/**
 * Ensure uniqueness by appending a suffix if slug already exists.
 * @param {string} baseSlug
 * @param {(slug: string) => Promise<boolean>} existsFn - returns true if slug taken
 */
export async function uniqueSlug(baseSlug, existsFn) {
  let candidate = baseSlug
  let i = 2
  while (await existsFn(candidate)) {
    candidate = `${baseSlug}-${i++}`
    if (i > 100) { candidate = `${baseSlug}-${Date.now()}`; break }
  }
  return candidate
}
