// Splits a recipe step's free-text instruction paragraph into individual
// sentences so the UI can render them as readable one-line sub-steps.
//
// Split rule: a sentence ends at . ! ? followed by whitespace and a new
// sentence start (capital letter, digit, or opening quote). This keeps
// decimals ("10.5 oz"), abbreviations ("e.g. spinach") and semicolon
// continuations intact.
//
// Display-only — the stored instruction text and JSON-LD schema output
// are unchanged.
export function splitInstructionSentences(text) {
  if (!text || typeof text !== 'string') return []
  return text
    .trim()
    .replace(/([.!?])\s+(?=[A-Z0-9"“])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}
