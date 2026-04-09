/**
 * Shopping list utilities — ingredient categorisation, extraction, merging.
 */

// ── Category classification ──────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  produce: [
    'tomato', 'spinach', 'kale', 'lettuce', 'onion', 'garlic', 'ginger',
    'pepper', 'capsicum', 'zucchini', 'courgette', 'broccoli', 'cauliflower',
    'carrot', 'celery', 'cucumber', 'avocado', 'lemon', 'lime', 'orange',
    'apple', 'banana', 'berry', 'berries', 'grape', 'mango', 'pineapple',
    'mushroom', 'potato', 'sweet potato', 'squash', 'pumpkin', 'eggplant',
    'aubergine', 'leek', 'asparagus', 'artichoke', 'beet', 'radish',
    'cabbage', 'brussels', 'corn', 'pea', 'bean sprout', 'herbs',
    'basil', 'cilantro', 'coriander', 'parsley', 'thyme', 'rosemary',
    'mint', 'dill', 'chive', 'scallion', 'spring onion',
  ],
  protein: [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal',
    'salmon', 'tuna', 'cod', 'tilapia', 'shrimp', 'prawn', 'fish', 'seafood',
    'tofu', 'tempeh', 'seitan', 'edamame',
    'egg', 'eggs',
    'lentil', 'chickpea', 'black bean', 'kidney bean', 'cannellini',
  ],
  dairy: [
    'milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'kefir',
    'ghee', 'sour cream', 'creme fraiche', 'ricotta', 'mozzarella',
    'parmesan', 'cheddar', 'feta', 'gouda', 'brie', 'camembert',
    'cottage cheese', 'cream cheese', 'half-and-half', 'whey',
  ],
  pantry: [
    'oil', 'olive oil', 'coconut oil', 'avocado oil', 'sesame oil',
    'vinegar', 'soy sauce', 'tamari', 'fish sauce', 'worcestershire',
    'flour', 'bread', 'pasta', 'rice', 'quinoa', 'oat', 'couscous',
    'lentil', 'chickpea', 'black bean', 'kidney bean', 'cannellini',
    'stock', 'broth', 'tomato paste', 'tomato sauce', 'canned tomato',
    'coconut milk', 'coconut cream',
    'honey', 'maple syrup', 'sugar', 'agave',
    'salt', 'pepper', 'cumin', 'paprika', 'turmeric', 'cinnamon',
    'nutmeg', 'oregano', 'basil', 'chili', 'cayenne', 'curry',
    'baking powder', 'baking soda', 'yeast', 'vanilla',
    'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'pine nut',
    'seed', 'nut', 'dried fruit', 'raisin',
    'protein powder', 'nutritional yeast',
  ],
  frozen: [
    'frozen', 'ice cream', 'sorbet',
  ],
  bakery: [
    'bread', 'roll', 'bun', 'bagel', 'croissant', 'muffin', 'cake',
    'tortilla', 'wrap', 'pita', 'naan', 'sourdough', 'baguette',
  ],
}

export function categorizeIngredient(name) {
  const lower = (name || '').toLowerCase()
  if (lower.includes('frozen')) return 'frozen'
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat
  }
  return 'other'
}

// ── Extract ingredients from a recipe ────────────────────────────────────────

/**
 * Given a recipe object, return a flat list of shopping items.
 * Recipe ingredients live in recipe.ingredients (array of {name, amount, unit}) or
 * recipe.steps[].ingredients, or a top-level ingredient_groups array.
 */
export function extractIngredientsFromRecipe(recipe) {
  if (!recipe) return []
  const items = []

  // Standard flat ingredients array
  const ings = recipe.ingredients || []
  for (const ing of ings) {
    if (!ing?.name) continue
    items.push({
      ingredient_name: ing.name,
      amount: parseFloat(ing.amount) || null,
      unit: ing.unit || null,
      category: categorizeIngredient(ing.name),
      source_recipe_id: recipe.id || null,
    })
  }

  // Ingredients embedded inside steps
  if (items.length === 0) {
    for (const step of recipe.steps || []) {
      for (const ing of step.ingredients || []) {
        if (!ing?.name) continue
        items.push({
          ingredient_name: ing.name,
          amount: parseFloat(ing.amount) || null,
          unit: ing.unit || null,
          category: categorizeIngredient(ing.name),
          source_recipe_id: recipe.id || null,
        })
      }
    }
  }

  return items
}

// ── Merge new items into existing list ───────────────────────────────────────

/**
 * Given existing items and new items, merge by matching ingredient_name + unit.
 * Returns {toInsert: [], toUpdate: [{id, amount}]}.
 */
export function mergeItems(existingItems, newItems) {
  const toInsert = []
  const toUpdate = []

  for (const ni of newItems) {
    const match = existingItems.find(ei =>
      ei.ingredient_name?.toLowerCase() === ni.ingredient_name?.toLowerCase() &&
      (ei.unit || '') === (ni.unit || '')
    )
    if (match) {
      // Merge amounts
      const merged = (parseFloat(match.amount) || 0) + (parseFloat(ni.amount) || 0)
      toUpdate.push({ id: match.id, amount: merged || null })
    } else {
      toInsert.push(ni)
    }
  }

  return { toInsert, toUpdate }
}

// ── Group items by category ───────────────────────────────────────────────────

const CATEGORY_ORDER = ['produce', 'protein', 'dairy', 'pantry', 'bakery', 'frozen', 'other']
const CATEGORY_LABELS = {
  produce: '🥦 Produce',
  protein: '🍗 Protein',
  dairy:   '🧀 Dairy',
  pantry:  '🫙 Pantry',
  frozen:  '🧊 Frozen',
  bakery:  '🍞 Bakery',
  other:   '📦 Other',
}

export function groupItemsByCategory(items) {
  const groups = {}
  for (const item of items) {
    const cat = item.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  // Sort unchecked first within each group
  for (const cat of Object.keys(groups)) {
    groups[cat].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0))
  }
  return CATEGORY_ORDER
    .filter(cat => groups[cat]?.length > 0)
    .map(cat => ({ key: cat, label: CATEGORY_LABELS[cat], items: groups[cat] }))
}

// ── Generate shareable text ───────────────────────────────────────────────────

export function generateShareText(groupedItems, listName = 'Shopping List') {
  const lines = [`📋 ${listName}\n`]
  for (const group of groupedItems) {
    lines.push(`\n${group.label}`)
    for (const item of group.items) {
      const qty = item.amount ? `${item.amount}${item.unit ? ' ' + item.unit : ''}` : ''
      const check = item.checked ? '✅' : '□'
      lines.push(`  ${check} ${item.ingredient_name}${qty ? ' — ' + qty : ''}`)
    }
  }
  return lines.join('\n')
}
