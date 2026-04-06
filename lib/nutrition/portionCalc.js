import { NUTRITION_FIELDS } from './nutrition';

/**
 * Mifflin-St Jeor BMR (kcal/day at rest).
 * Single source of truth — imported everywhere member BMR is needed.
 */
export function computeBMR(weight, height, age, gender) {
  if (!weight || !height || !age) return null;
  return gender === 'female'
    ? Math.round(10 * weight + 6.25 * height - 5 * age - 161)
    : Math.round(10 * weight + 6.25 * height - 5 * age + 5);
}

export const SEDENTARY_MULTIPLIER = 1.2;

export function computeTDEE(weight, height, age, gender) {
  const bmr = computeBMR(weight, height, age, gender);
  return bmr ? Math.round(bmr * SEDENTARY_MULTIPLIER) : null;
}

/**
 * Compute each family member's BMI and their fraction of total family BMI.
 */
export function computeFamilyBMI(family) {
  const familyWithBMI = family
    .map(m => {
      if (!m.weight || !m.height) return null;
      const bmi = m.weight / Math.pow(m.height / 100, 2);
      return { id: m.id, bmi };
    })
    .filter(Boolean);
  const totalBMI = familyWithBMI.reduce((s, x) => s + x.bmi, 0);
  return { familyWithBMI, totalBMI };
}

/**
 * Get a single member's BMI fraction of total family BMI.
 * Falls back to equal split if BMI data unavailable.
 */
export function getMemberBMIFraction(member, family) {
  const { familyWithBMI, totalBMI } = computeFamilyBMI(family);
  const entry = familyWithBMI.find(x => x.id === member.id);
  return (entry && totalBMI > 0) ? entry.bmi / totalBMI : 1 / (family.length || 1);
}

/**
 * Activity multiplier: if member burned calories, scale portion up proportionally.
 * Same logic as RecipeDetail.jsx memberActivityFactor.
 */
export function getMemberActivityFactor(member, memberActivities) {
  const burned = parseFloat(memberActivities?.[member.id]?.calories) || 0;
  if (burned > 0 && member.baseDailyCalories) {
    return 1 + burned / member.baseDailyCalories;
  }
  return 1;
}

/**
 * Compute personal nutrition for a single member from a recipe.
 * Uses recipe.nutrition.totals scaled by BMI fraction × activity factor.
 * Returns an object keyed by nutrition field key with numeric values, or null.
 */
export function computeMemberNutrition(member, family, recipeTotals, memberActivities) {
  if (!recipeTotals) return null;
  const fraction = getMemberBMIFraction(member, family);
  const actFactor = getMemberActivityFactor(member, memberActivities);
  const scale = fraction * actFactor;
  const result = {};
  for (const field of NUTRITION_FIELDS) {
    const val = recipeTotals[field.key];
    if (typeof val === 'number') {
      result[field.key] = val * scale;
    }
  }
  return result;
}
