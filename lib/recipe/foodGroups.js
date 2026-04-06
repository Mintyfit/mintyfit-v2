export const FOOD_GROUPS = [
  { label: '🥩 Meat & Poultry', keywords: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'veal', 'duck', 'goose', 'rabbit', 'venison', 'bacon', 'ham', 'sausage', 'mince', 'steak'] },
  { label: '🐟 Fish & Seafood', keywords: ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'cod', 'haddock', 'mackerel', 'sardine', 'anchovy', 'lobster', 'crab', 'squid', 'octopus', 'mussel', 'oyster', 'clam', 'tilapia', 'trout', 'bass', 'halibut'] },
  { label: '🥛 Dairy & Eggs', keywords: ['milk', 'cheese', 'yogurt', 'yoghurt', 'egg', 'butter', 'cream', 'ghee', 'curd', 'whey', 'mozzarella', 'parmesan', 'cheddar', 'feta', 'ricotta', 'brie', 'gouda'] },
  { label: '🌾 Grains & Cereals', keywords: ['flour', 'bread', 'pasta', 'rice', 'oat', 'wheat', 'barley', 'rye', 'quinoa', 'couscous', 'polenta', 'noodle', 'cracker', 'cereal', 'bran', 'semolina', 'cornmeal', 'tortilla', 'pita'] },
  { label: '🫘 Legumes & Pulses', keywords: ['bean', 'lentil', 'chickpea', 'pea', 'soy', 'tofu', 'tempeh', 'edamame', 'mung', 'kidney', 'black bean', 'navy bean', 'fava', 'hummus'] },
  { label: '🥦 Vegetables', keywords: ['onion', 'garlic', 'tomato', 'carrot', 'potato', 'pepper', 'spinach', 'broccoli', 'cauliflower', 'celery', 'zucchini', 'courgette', 'eggplant', 'aubergine', 'lettuce', 'kale', 'cabbage', 'mushroom', 'asparagus', 'artichoke', 'cucumber', 'pumpkin', 'squash', 'leek', 'beetroot', 'radish', 'turnip', 'fennel', 'corn', 'maize', 'sweet potato', 'yam'] },
  { label: '🍋 Fruit', keywords: ['apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry', 'raspberry', 'mango', 'pineapple', 'peach', 'pear', 'plum', 'cherry', 'avocado', 'watermelon', 'melon', 'kiwi', 'papaya', 'coconut', 'fig', 'date', 'apricot', 'grapefruit', 'pomegranate', 'passion fruit'] },
  { label: '🫙 Condiments & Sauces', keywords: ['sauce', 'ketchup', 'mustard', 'vinegar', 'soy sauce', 'worcestershire', 'tabasco', 'mayo', 'mayonnaise', 'dressing', 'marinade', 'paste', 'concentrate', 'puree', 'tahini', 'miso', 'hoisin', 'oyster sauce', 'fish sauce', 'hot sauce'] },
  { label: '🌿 Herbs & Spices', keywords: ['salt', 'pepper', 'cumin', 'coriander', 'paprika', 'turmeric', 'cinnamon', 'ginger', 'basil', 'oregano', 'thyme', 'rosemary', 'parsley', 'mint', 'dill', 'bay', 'chili', 'chilli', 'cayenne', 'nutmeg', 'clove', 'cardamom', 'saffron', 'vanilla', 'curry', 'allspice', 'star anise'] },
  { label: '🫒 Oils & Fats', keywords: ['oil', 'lard', 'margarine', 'shortening', 'coconut oil', 'olive oil', 'vegetable oil', 'sunflower oil', 'canola oil', 'sesame oil'] },
  { label: '🍫 Sweeteners & Baking', keywords: ['sugar', 'honey', 'syrup', 'molasses', 'stevia', 'agave', 'chocolate', 'cocoa', 'baking powder', 'baking soda', 'yeast', 'gelatin', 'agar', 'starch', 'cornstarch', 'vanilla extract'] },
  { label: '🥜 Nuts & Seeds', keywords: ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'peanut', 'hazelnut', 'macadamia', 'pine nut', 'sesame', 'chia', 'flax', 'sunflower seed', 'pumpkin seed', 'hemp seed', 'poppy seed'] },
];

export function classifyFoodGroup(name) {
  if (!name) return '🛒 Other';
  const n = name.toLowerCase();
  for (const g of FOOD_GROUPS) {
    if (g.keywords.some(k => n.includes(k))) return g.label;
  }
  return '🛒 Other';
}

export function groupIngredients(ingredients) {
  const groups = {};
  for (const ing of ingredients) {
    const group = classifyFoodGroup(ing.name);
    if (!groups[group]) groups[group] = [];
    groups[group].push(ing);
  }
  return groups;
}
