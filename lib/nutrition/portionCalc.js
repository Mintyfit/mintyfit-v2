import { NUTRITION_FIELDS } from './nutrition';

/**
 * BMR (kcal/day at rest). Single source of truth for all member energy targets.
 *
 * Stages (in order):
 *   1. Body-fat override (Katch-McArdle) — adults with body_fat_pct, not pregnant
 *   2. Age-banded base equation
 *      - <3, 3–9, 10–17  → Schofield (sex-specific)
 *      - 18+             → Mifflin-St Jeor
 *   3. Life-stage addition (adult females only): pregnancy trimester or lactation months
 *
 * Accepts either positional args (legacy) or a single user object with extras.
 * Rounded to nearest 10 kcal — false precision otherwise.
 *
 * @param {Object|number} userOrWeight
 * @param {number} [height] cm
 * @param {number} [age] years
 * @param {string} [gender] 'male' | 'female'
 */
export function computeBMR(userOrWeight, height, age, gender) {
  const user = (typeof userOrWeight === 'object' && userOrWeight !== null)
    ? userOrWeight
    : { weight: userOrWeight, height, age, gender };

  const weight_kg = Number(user.weight ?? user.weight_kg);
  const height_cm = Number(user.height ?? user.height_cm);
  const ageYears  = Number(user.age);
  const sex       = user.gender || user.sex || 'female';
  const bodyFat   = Number(user.body_fat_pct);
  const pregnancy = user.pregnancy || null;
  const lactation = user.lactation || null;

  if (!weight_kg || weight_kg < 2) return null;
  if (ageYears == null || Number.isNaN(ageYears)) return null;
  if (height_cm && height_cm < 30) return null;

  // Validation: pregnancy/lactation only valid for adult-ish females
  const validLifeStage = sex === 'female' && ageYears >= 12 && ageYears <= 55;
  const usePregnancy = pregnancy && validLifeStage;
  const useLactation = lactation && validLifeStage && !pregnancy;

  let bmr;

  // Stage 1: body-fat override (Katch-McArdle), adults only, not pregnant
  if (bodyFat >= 3 && bodyFat <= 60 && ageYears >= 18 && !usePregnancy) {
    const lbm = weight_kg * (1 - bodyFat / 100);
    bmr = 370 + 21.6 * lbm;
    if (useLactation) bmr += lactationAddition(lactation.months_postpartum);
    return Math.round(bmr / 10) * 10;
  }

  // Stage 2: age-banded
  if (ageYears < 3) {
    bmr = sex === 'male'
      ? 59.512 * weight_kg - 30.4
      : 58.317 * weight_kg - 31.1;
  } else if (ageYears < 10) {
    bmr = sex === 'male'
      ? 22.706 * weight_kg + 504.3
      : 20.315 * weight_kg + 485.9;
  } else if (ageYears < 18) {
    bmr = sex === 'male'
      ? 17.686 * weight_kg + 658.2
      : 13.384 * weight_kg + 692.6;
  } else {
    if (!height_cm) return null; // Mifflin needs height
    const base = 10 * weight_kg + 6.25 * height_cm - 5 * ageYears;
    bmr = sex === 'male' ? base + 5 : base - 161;
  }

  // Stage 3: life-stage addition
  if (usePregnancy)      bmr += pregnancyAddition(pregnancy.trimester);
  else if (useLactation) bmr += lactationAddition(lactation.months_postpartum);

  return Math.round(bmr / 10) * 10;
}

export function pregnancyAddition(trimester) {
  return ({ 1: 85, 2: 285, 3: 475 })[trimester] || 0;
}

export function lactationAddition(months) {
  if (months == null) return 0;
  if (months <= 6)  return 500;
  if (months <= 12) return 400;
  return 300;
}

/**
 * Returns a structured breakdown of how BMR was derived — for display on the
 * Account page so the user can see exactly which equation drove their target.
 */
export function explainBMR(user) {
  const weight_kg = Number(user.weight ?? user.weight_kg);
  const height_cm = Number(user.height ?? user.height_cm);
  const ageYears  = Number(user.age);
  const sex       = user.gender || user.sex || 'female';
  const bodyFat   = Number(user.body_fat_pct);
  const validLifeStage = sex === 'female' && ageYears >= 12 && ageYears <= 55;
  const usePregnancy = user.pregnancy && validLifeStage;
  const useLactation = user.lactation && validLifeStage && !usePregnancy;

  const bmr = computeBMR(user);

  let branch, formula;
  if (bodyFat >= 3 && bodyFat <= 60 && ageYears >= 18 && !usePregnancy) {
    branch = 'Katch-McArdle (body-fat override)';
    const lbm = weight_kg * (1 - bodyFat / 100);
    formula = `370 + 21.6 × LBM(${lbm.toFixed(1)} kg)`;
  } else if (ageYears < 3) {
    branch = 'Schofield (under 3)';
    formula = sex === 'male' ? `59.512 × ${weight_kg} − 30.4` : `58.317 × ${weight_kg} − 31.1`;
  } else if (ageYears < 10) {
    branch = 'Schofield (3–9)';
    formula = sex === 'male' ? `22.706 × ${weight_kg} + 504.3` : `20.315 × ${weight_kg} + 485.9`;
  } else if (ageYears < 18) {
    branch = 'Schofield (10–17)';
    formula = sex === 'male' ? `17.686 × ${weight_kg} + 658.2` : `13.384 × ${weight_kg} + 692.6`;
  } else {
    branch = 'Mifflin-St Jeor (18+)';
    formula = sex === 'male'
      ? `10 × ${weight_kg} + 6.25 × ${height_cm} − 5 × ${ageYears} + 5`
      : `10 × ${weight_kg} + 6.25 × ${height_cm} − 5 × ${ageYears} − 161`;
  }

  const additions = [];
  if (usePregnancy) additions.push({ label: `Pregnancy trimester ${user.pregnancy.trimester}`, kcal: pregnancyAddition(user.pregnancy.trimester) });
  if (useLactation) additions.push({ label: `Lactation (${user.lactation.months_postpartum} mo postpartum)`, kcal: lactationAddition(user.lactation.months_postpartum) });

  return { bmr, branch, formula, additions };
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
