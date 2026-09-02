/**
 * extractJSON — canonical JSON extraction from LLM responses.
 * Handles markdown fences and prose around JSON; depth-tracking is brace/
 * bracket- and string-escape aware, so nested structures extract correctly.
 *
 * THE ONLY copy in the codebase — do not re-implement (7 copies existed).
 */
export function extractJSON(text) {
  // 1. Fenced code block
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) { try { return JSON.parse(fenced[1]) } catch {} }

  // 2. Depth-tracking extraction of the outermost { } or [ ]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') {
      const opener = text[i]
      const closer = opener === '{' ? '}' : ']'
      let depth = 0, inString = false, escape = false
      for (let j = i; j < text.length; j++) {
        const ch = text[j]
        if (escape) { escape = false; continue }
        if (ch === '\\' && inString) { escape = true; continue }
        if (ch === '"') { inString = !inString; continue }
        if (inString) continue
        if (ch === opener) depth++
        if (ch === closer) {
          depth--
          if (depth === 0) return JSON.parse(text.slice(i, j + 1))
        }
      }
    }
  }
  throw new Error('No JSON found in response')
}
