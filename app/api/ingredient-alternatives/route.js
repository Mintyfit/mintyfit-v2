// ── Hardcoded substitution table (instant, free) ──────────────────────────────
// Used as first-pass lookup. Falls back to Claude Haiku for anything not here.

const SUBSTITUTIONS = {
  // Proteins
  'chicken breast': [
    { name: 'turkey breast', note: 'Leaner, similar protein', amount_factor: 1 },
    { name: 'tofu', note: 'Plant-based, high protein', amount_factor: 1.2 },
    { name: 'cod fillet', note: 'Lower fat, high protein', amount_factor: 1 },
    { name: 'pork tenderloin', note: 'Similar texture and protein', amount_factor: 1 },
  ],
  'beef mince': [
    { name: 'turkey mince', note: 'Lower fat, same protein', amount_factor: 1 },
    { name: 'lentils', note: 'Plant-based, high fibre', amount_factor: 1.5 },
    { name: 'pork mince', note: 'Similar flavour profile', amount_factor: 1 },
    { name: 'chicken mince', note: 'Leaner alternative', amount_factor: 1 },
  ],
  'salmon': [
    { name: 'trout', note: 'Similar omega-3 content', amount_factor: 1 },
    { name: 'mackerel', note: 'Higher omega-3, stronger flavour', amount_factor: 1 },
    { name: 'tuna steak', note: 'Lower fat, high protein', amount_factor: 1 },
    { name: 'cod fillet', note: 'Milder flavour, lower fat', amount_factor: 1 },
  ],
  // Dairy
  'butter': [
    { name: 'olive oil', note: 'Heart-healthy fats, use ¾ the amount', amount_factor: 0.75 },
    { name: 'coconut oil', note: 'Neutral flavour, same amount', amount_factor: 1 },
    { name: 'avocado oil', note: 'High smoke point, healthy fats', amount_factor: 0.75 },
    { name: 'Greek yoghurt', note: 'In baking only, lower fat', amount_factor: 1 },
  ],
  'milk': [
    { name: 'oat milk', note: 'Creamy, plant-based', amount_factor: 1 },
    { name: 'almond milk', note: 'Lower calorie, plant-based', amount_factor: 1 },
    { name: 'soy milk', note: 'Highest protein plant milk', amount_factor: 1 },
    { name: 'coconut milk', note: 'Richer flavour, higher fat', amount_factor: 1 },
  ],
  'cream': [
    { name: 'coconut cream', note: 'Dairy-free, similar richness', amount_factor: 1 },
    { name: 'Greek yoghurt', note: 'Lower fat, add at end off heat', amount_factor: 1 },
    { name: 'oat cream', note: 'Plant-based, lighter', amount_factor: 1 },
    { name: 'evaporated milk', note: 'Lower fat alternative', amount_factor: 1 },
  ],
  // Grains
  'white rice': [
    { name: 'brown rice', note: 'More fibre and nutrients', amount_factor: 1 },
    { name: 'quinoa', note: 'Complete protein, high fibre', amount_factor: 0.8 },
    { name: 'cauliflower rice', note: 'Very low carb', amount_factor: 1.5 },
    { name: 'bulgur wheat', note: 'Higher fibre, nuttier flavour', amount_factor: 0.8 },
  ],
  'pasta': [
    { name: 'wholemeal pasta', note: 'More fibre, same taste', amount_factor: 1 },
    { name: 'courgette noodles', note: 'Very low carb', amount_factor: 1.5 },
    { name: 'lentil pasta', note: 'Higher protein and fibre', amount_factor: 1 },
    { name: 'chickpea pasta', note: 'Gluten-free, high protein', amount_factor: 1 },
  ],
  'bread': [
    { name: 'wholegrain bread', note: 'More fibre and nutrients', amount_factor: 1 },
    { name: 'sourdough', note: 'Lower glycaemic index', amount_factor: 1 },
    { name: 'lettuce wraps', note: 'Very low carb', amount_factor: 2 },
    { name: 'rice cakes', note: 'Gluten-free option', amount_factor: 1 },
  ],
  // Oils
  'olive oil': [
    { name: 'avocado oil', note: 'Higher smoke point', amount_factor: 1 },
    { name: 'rapeseed oil', note: 'Milder flavour, cheaper', amount_factor: 1 },
    { name: 'coconut oil', note: 'Distinctive flavour', amount_factor: 1 },
    { name: 'sunflower oil', note: 'Neutral flavour', amount_factor: 1 },
  ],
  // Sweeteners
  'sugar': [
    { name: 'honey', note: 'Natural, slightly sweeter — use less', amount_factor: 0.75 },
    { name: 'maple syrup', note: 'Natural, use same amount', amount_factor: 0.75 },
    { name: 'coconut sugar', note: 'Lower GI, same amount', amount_factor: 1 },
    { name: 'stevia', note: 'Zero calorie — use very small amount', amount_factor: 0.1 },
  ],
  // Vegetables
  'spinach': [
    { name: 'kale', note: 'More nutrients, slightly bitter', amount_factor: 1 },
    { name: 'swiss chard', note: 'Similar texture and taste', amount_factor: 1 },
    { name: 'rocket', note: 'Peppery flavour', amount_factor: 1 },
    { name: 'watercress', note: 'Iron-rich, peppery', amount_factor: 1 },
  ],
  'broccoli': [
    { name: 'cauliflower', note: 'Milder flavour, similar texture', amount_factor: 1 },
    { name: 'broccolini', note: 'More tender, milder', amount_factor: 1 },
    { name: 'Brussels sprouts', note: 'Similar nutrients', amount_factor: 1 },
    { name: 'green beans', note: 'Lower calorie, crisp texture', amount_factor: 1 },
  ],
  'onion': [
    { name: 'shallots', note: 'Milder, sweeter flavour', amount_factor: 1.5 },
    { name: 'leek', note: 'Milder flavour', amount_factor: 1 },
    { name: 'spring onions', note: 'Milder, use raw or cooked', amount_factor: 1.5 },
    { name: 'fennel', note: 'Anise flavour, great roasted', amount_factor: 1 },
  ],
  'garlic': [
    { name: 'garlic powder', note: 'Dried — use ¼ the amount', amount_factor: 0.25 },
    { name: 'garlic paste', note: 'Same intensity, more convenient', amount_factor: 1 },
    { name: 'shallots', note: 'Milder garlic-onion flavour', amount_factor: 3 },
    { name: 'asafoetida', note: 'Strong garlic substitute — tiny pinch only', amount_factor: 0.05 },
  ],
  // Eggs
  'egg': [
    { name: 'flax egg', note: '1 tbsp flaxseed + 3 tbsp water. Vegan baking', amount_factor: 1 },
    { name: 'chia egg', note: '1 tbsp chia + 3 tbsp water. Vegan baking', amount_factor: 1 },
    { name: 'aquafaba', note: '3 tbsp chickpea water. Best for meringues', amount_factor: 1 },
    { name: 'silken tofu', note: '¼ cup per egg. Great in baked goods', amount_factor: 1 },
  ],
  'eggs': [
    { name: 'flax egg', note: '1 tbsp flaxseed + 3 tbsp water per egg. Vegan baking', amount_factor: 1 },
    { name: 'chia egg', note: '1 tbsp chia + 3 tbsp water per egg. Vegan baking', amount_factor: 1 },
    { name: 'aquafaba', note: '3 tbsp per egg. Best for meringues', amount_factor: 1 },
    { name: 'silken tofu', note: '¼ cup per egg. Great in baked goods', amount_factor: 1 },
  ],
  // Legumes
  'chickpeas': [
    { name: 'cannellini beans', note: 'Creamier texture, same protein', amount_factor: 1 },
    { name: 'lentils', note: 'Higher iron, cooks faster', amount_factor: 1 },
    { name: 'butter beans', note: 'Creamy, mild flavour', amount_factor: 1 },
    { name: 'edamame', note: 'Higher protein, firmer texture', amount_factor: 1 },
  ],
}

function findHardcodedAlternatives(ingredientName) {
  const lower = ingredientName.toLowerCase().trim()
  if (SUBSTITUTIONS[lower]) return SUBSTITUTIONS[lower]
  for (const [key, alts] of Object.entries(SUBSTITUTIONS)) {
    if (lower.includes(key) || key.includes(lower)) return alts
  }
  return null
}

// ── JSON extraction (same logic as ingredientSwap.js) ─────────────────────────
function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) { try { return JSON.parse(fenced[1]) } catch {} }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      let depth = 0, inStr = false, esc = false
      for (let j = i; j < text.length; j++) {
        const ch = text[j]
        if (esc) { esc = false; continue }
        if (ch === '\\' && inStr) { esc = true; continue }
        if (ch === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (ch === '[') depth++
        else if (ch === ']') { depth--; if (depth === 0) { try { return JSON.parse(text.slice(i, j + 1)) } catch {} break } }
      }
    }
  }
  return JSON.parse(text)
}

// ── Claude Haiku fallback (same logic as getSwapSuggestions) ──────────────────
const HAIKU = 'claude-haiku-4-5-20251001'

async function getAISuggestions(ingredientName, recipeContext) {
  const { title = '', cuisine_type = '', meal_type = '', food_type = '', otherIngredients = [] } = recipeContext
  const otherList = otherIngredients.slice(0, 15).join(', ') || 'none listed'

  const prompt = `You are a culinary nutritionist. Suggest 4-5 ingredient alternatives for "${ingredientName}" in a ${cuisine_type} ${meal_type} recipe called "${title}".

Other ingredients in this recipe: ${otherList}

Rules:
- Suggest ingredients that fit the cuisine and meal type
- Adjust amounts appropriately (not always 1:1 by weight — e.g. swapping chicken for tofu needs a higher volume)
- Give a brief, specific reason for each (dietary benefit, texture match, flavor profile)
- Never suggest an ingredient already in the recipe
- Return ONLY a valid JSON array, no markdown or prose

Format:
[
  { "name": "ingredient name", "amount": 250, "unit": "g", "reason": "brief reason" },
  ...
]`

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
      system: 'You are a culinary nutritionist. Return ONLY valid JSON arrays with no explanation.',
    }),
  })

  if (!res.ok) throw new Error(`Claude API error ${res.status}`)
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  return extractJSON(text)
}

// ── Route handler ─────────────────────────────────────────────────────────────
export const maxDuration = 30

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ingredient = searchParams.get('ingredient') || ''

  if (!ingredient.trim()) {
    return Response.json({ alternatives: [] })
  }

  // 1. Try hardcoded table first (instant, free)
  const hardcoded = findHardcodedAlternatives(ingredient)
  if (hardcoded) {
    return Response.json({ alternatives: hardcoded, source: 'db' })
  }

  // 2. Fall back to AI-powered suggestions via Claude Haiku
  const recipeContext = {
    title: searchParams.get('title') || '',
    cuisine_type: searchParams.get('cuisine') || '',
    meal_type: searchParams.get('meal') || '',
    food_type: searchParams.get('food') || '',
    otherIngredients: searchParams.get('others')?.split(',').map(s => s.trim()).filter(Boolean) || [],
  }

  try {
    const suggestions = await getAISuggestions(ingredient, recipeContext)

    if (!Array.isArray(suggestions)) {
      return Response.json({ alternatives: [], source: 'none' })
    }

    const alternatives = suggestions.map(s => ({
      name: s.name,
      note: s.reason || '',
      amount_factor: s.amount ? s.amount / 100 : 1,
    }))

    return Response.json({ alternatives, source: 'ai' })
  } catch (error) {
    console.error('Ingredient alternatives AI fallback failed:', error.message)
    return Response.json({ alternatives: [], source: 'none' })
  }
}
