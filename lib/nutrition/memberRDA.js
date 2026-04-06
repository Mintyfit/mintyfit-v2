export function computeMemberDailyNeeds(member) {
  const dc = member.baseDailyCalories || 2000;
  const w  = member.weight || 70;
  const g  = member.gender || 'female';
  const age = member.age || 30;
  const isMale = g === 'male';
  const isChild = age < 14;
  const isOver50 = age >= 50;

  return {
    // Energy
    energy_kcal: dc,
    energy_kj: dc * 4.184,

    // Macros (metabolic-health focused: low carb, higher protein, healthy fats)
    protein: w * 1.2,
    carbs_total: dc * 9 / 100 / 4,
    carbs_absorbed: (dc * 9 / 100 / 4) * 0.85,
    fiber: isMale ? (dc / 1000 * 38) : (dc / 1000 * 25),

    // Sugars
    sucrose: 10 * dc / 100 * 0.1296,
    glucose: 10 * dc / 100 * 0.1296,
    fructose: 10 * dc / 100 * 0.1296,
    galactose: null,  // no target

    // Fats
    fat_total: (dc / 100 * 0.1296) + (10 * dc / 100 * 0.1296) + (25 * dc / 100 * 0.1296) + (25 * dc / 100 * 0.1296),  // sum of trans + saturated + mono + poly
    fat_trans: dc / 100 * 0.1296,
    fat_saturated: 10 * dc / 100 * 0.1296,
    fat_monounsaturated: 25 * dc / 100 * 0.1296,
    fat_polyunsaturated: 25 * dc / 100 * 0.1296,
    fat_palmitic: 12 * dc / 100 * 0.1296,
    fat_stearic: 12 * dc / 100 * 0.1296,
    fat_linoleic: 7 * dc / 100 * 0.1296,
    fat_linolenic: 2 * dc / 100 * 0.1296,
    cholesterol: (dc / 2000) * 300,

    // Minerals
    sodium: dc / 1.050,
    potassium: isMale ? (dc / 2000) * 3000 : (dc / 2000) * 2800,
    calcium: isOver50 ? dc / 1.650 : dc / 1.800,
    magnesium: isMale ? (dc / 2000) * 420 : (dc / 2000) * 320,
    phosphorus: (dc / 2000) * 700,
    iron: (isMale || isOver50) ? dc / 250 : dc / 110,
    zinc: dc / 200,
    copper: dc / 2000,
    manganese: dc / 1000,
    iodine: isChild
      ? (age <= 8 ? dc / 22000 : dc / 16000)
      : dc / 14000,
    selenium: (dc / 2000) * 55,
    chrome: dc / 60000,
    nickel: null,  // hidden
    salt_equiv: (dc / 2000) * 5,

    // Vitamins
    vit_a: dc * 0.4,
    retinol: dc * 0.4,
    vit_d: dc * 10 / 1000,
    vit_d3: dc * 10 / 1000,
    vit_e: (dc / 2000) * 15,
    vit_k: isMale ? (dc / 2000) * 120 : (dc / 2000) * 90,
    vit_b1: isMale ? (dc / 2000) * 1.2 : (dc / 2000) * 1.1,
    vit_b2: isMale ? (dc / 2000) * 1.3 : (dc / 2000) * 1.1,
    niacin: isMale ? (dc / 2000) * 16 : (dc / 2000) * 14,
    niacin_tryptophan: null,  // derived from niacin, not a direct target
    pantothenic_acid: (dc / 2000) * 5,
    vit_b6: (dc / 2000) * 1.3,
    biotin: (dc / 2000) * 30,
    folates: (dc / 2000) * 400,
    vit_b12: (dc / 2000) * 2.4,
    vit_c: isMale ? (dc / 2000) * 90 : (dc / 2000) * 75,

    // Other
    water: null,  // calculated separately (weight × activity ml/kg)
    ash: null,    // hidden
  };
}
