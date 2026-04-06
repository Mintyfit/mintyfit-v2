/**
 * Look up a product by barcode from Open Food Facts.
 * Returns { found, product, nutritionPer100g } or { found: false, error }.
 */
export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,serving_size,nutriments,image_front_small_url`
    );
    if (!res.ok) return { found: false, error: `API error ${res.status}` };

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return { found: false, error: 'Product not found in Open Food Facts' };
    }

    const p = data.product;
    const n = p.nutriments || {};

    // Map Open Food Facts nutriment keys → MintyFit NUTRITION_FIELDS keys.
    // OFF stores values per 100g. We return per-100g values.
    // The user specifies their portion amount and we scale accordingly.
    const nutrition = {
      energy_kcal:         n['energy-kcal_100g']          ?? n['energy-kcal']       ?? null,
      energy_kj:           n['energy-kj_100g']            ?? n['energy_100g']        ?? null,
      protein:             n['proteins_100g']              ?? null,
      carbs_total:         n['carbohydrates_100g']         ?? null,
      carbs_absorbed:      null, // not in OFF
      fiber:               n['fiber_100g']                 ?? null,
      sucrose:             n['sucrose_100g']               ?? null,
      glucose:             n['glucose_100g']               ?? null,
      fructose:            n['fructose_100g']              ?? null,
      galactose:           n['galactose_100g']             ?? null,
      fat_total:           n['fat_100g']                   ?? null,
      fat_trans:           n['trans-fat_100g']             ?? null,
      fat_saturated:       n['saturated-fat_100g']         ?? null,
      fat_monounsaturated: n['monounsaturated-fat_100g']   ?? null,
      fat_polyunsaturated: n['polyunsaturated-fat_100g']   ?? null,
      fat_palmitic:        n['palmitic-acid_100g']         ?? null,
      fat_stearic:         n['stearic-acid_100g']          ?? null,
      fat_linoleic:        n['linoleic-acid_100g']         ?? null,
      fat_linolenic:       n['alpha-linolenic-acid_100g']  ?? null,
      cholesterol:         n['cholesterol_100g'] != null ? n['cholesterol_100g'] * 1000 : null,  // g → mg
      sodium:              n['sodium_100g']      != null ? n['sodium_100g']      * 1000 : null,  // g → mg
      potassium:           n['potassium_100g']   != null ? n['potassium_100g']   * 1000 : null,
      calcium:             n['calcium_100g']     != null ? n['calcium_100g']     * 1000 : null,
      magnesium:           n['magnesium_100g']   != null ? n['magnesium_100g']   * 1000 : null,
      phosphorus:          n['phosphorus_100g']  != null ? n['phosphorus_100g']  * 1000 : null,
      iron:                n['iron_100g']        != null ? n['iron_100g']        * 1000 : null,
      zinc:                n['zinc_100g']        != null ? n['zinc_100g']        * 1000 : null,
      copper:              n['copper_100g']      != null ? n['copper_100g']      * 1000 : null,
      manganese:           n['manganese_100g']   != null ? n['manganese_100g']   * 1000 : null,
      iodine:              n['iodine_100g']      != null ? n['iodine_100g']      * 1000000 : null,  // g → µg
      selenium:            n['selenium_100g']    != null ? n['selenium_100g']    * 1000000 : null,
      chrome:              n['chromium_100g']    != null ? n['chromium_100g']    * 1000000 : null,
      nickel:              null,
      salt_equiv:          n['salt_100g']                  ?? null,
      vit_a:               n['vitamin-a_100g']   != null ? n['vitamin-a_100g']   * 1000000 : null,  // g → µg
      retinol:             n['retinol_100g']     != null ? n['retinol_100g']     * 1000000 : null,
      vit_d:               n['vitamin-d_100g']   != null ? n['vitamin-d_100g']   * 1000000 : null,
      vit_d3:              null, // OFF doesn't separate D3
      vit_e:               n['vitamin-e_100g']   != null ? n['vitamin-e_100g']   * 1000 : null,     // g → mg
      vit_k:               n['vitamin-k_100g']   != null ? n['vitamin-k_100g']   * 1000000 : null,
      vit_b1:              n['vitamin-b1_100g']  != null ? n['vitamin-b1_100g']  * 1000 : null,
      vit_b2:              n['vitamin-b2_100g']  != null ? n['vitamin-b2_100g']  * 1000 : null,
      niacin:              n['vitamin-pp_100g']  != null ? n['vitamin-pp_100g']  * 1000 : null,
      niacin_tryptophan:   null,
      pantothenic_acid:    n['pantothenic-acid_100g'] != null ? n['pantothenic-acid_100g'] * 1000 : null,
      vit_b6:              n['vitamin-b6_100g']  != null ? n['vitamin-b6_100g']  * 1000 : null,
      biotin:              n['biotin_100g']      != null ? n['biotin_100g']      * 1000000 : null,
      folates:             n['vitamin-b9_100g']  != null ? n['vitamin-b9_100g']  * 1000000 : null,
      vit_b12:             n['vitamin-b12_100g'] != null ? n['vitamin-b12_100g'] * 1000000 : null,
      vit_c:               n['vitamin-c_100g']   != null ? n['vitamin-c_100g']   * 1000 : null,
      water:               n['water_100g']                 ?? null,
      ash:                 null,
    };

    // Strip nulls so they don't overwrite existing data
    const cleanNutrition = {};
    for (const [key, val] of Object.entries(nutrition)) {
      if (val !== null && !isNaN(val)) cleanNutrition[key] = val;
    }

    const result = {
      found: true,
      product: {
        name: p.product_name || 'Unknown product',
        brand: p.brands || '',
        servingSize: p.serving_size || '100g',
        image: p.image_front_small_url || null,
      },
      nutritionPer100g: cleanNutrition,
    };

    // Side effect: populate ingredients table so future lookups hit the DB
    const productName = p.product_name;
    if (productName && Object.keys(cleanNutrition).length > 0) {
      import('@/lib/recipe/ingredientDatabase').then(({ writeIngredient }) => {
        writeIngredient({
          name: productName,
          nutrition_per_100g: cleanNutrition,
          source: 'openfoodfacts',
        });
      }).catch(() => {});
    }

    return result;
  } catch (err) {
    return { found: false, error: err.message || 'Network error' };
  }
}

/**
 * Scale nutrition from per-100g to the user's specified amount.
 */
export function scaleNutritionByAmount(nutritionPer100g, amountG) {
  const factor = amountG / 100;
  const scaled = {};
  for (const [key, val] of Object.entries(nutritionPer100g)) {
    if (typeof val === 'number') {
      scaled[key] = val * factor;
    }
  }
  return scaled;
}
