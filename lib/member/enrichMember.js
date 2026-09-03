import { computeBMR, SEDENTARY_MULTIPLIER } from '@/lib/nutrition/portionCalc'

function estimateDailyCalories(age, gender) {
  const isMale = gender === 'male'
  if (age < 3) return isMale ? 1000 : 950
  if (age < 9) return isMale ? 1400 : 1200
  if (age < 14) return isMale ? 1800 : 1600
  if (age < 19) return isMale ? 2400 : 1800
  if (age < 31) return isMale ? 2500 : 1900
  if (age < 51) return isMale ? 2300 : 1800
  return isMale ? 2100 : 1600
}

function estimateWeight(age, gender) {
  const isMale = gender === 'male'
  if (age < 3) return isMale ? 13 : 12
  if (age < 9) return isMale ? 25 : 23
  if (age < 14) return isMale ? 40 : 38
  if (age < 19) return isMale ? 60 : 52
  return isMale ? 75 : 63
}

function estimateHeight(age, gender) {
  const isMale = gender === 'male'
  if (age < 3) return isMale ? 90 : 88
  if (age < 9) return isMale ? 120 : 115
  if (age < 14) return isMale ? 150 : 145
  if (age < 19) return isMale ? 170 : 160
  return isMale ? 175 : 162
}

/**
 * Single source of truth for enriching a family member with computed
 * baseDailyCalories, fallback weight/height, and display_name.
 *
 * When real weight/height is missing, uses age+gender reference estimates
 * so every member gets a personalized BMR, daily target, and BMI fraction
 * — not the same 2000 kcal / equal-split default.
 */
export function enrichMember(m) {
  if (!m) return m
  const age = m.age || 30
  const gender = m.gender || 'female'
  const estimatedWeight = m.weight == null || m.weight === ''
  const estimatedHeight = m.height == null || m.height === ''
  const weight = m.weight || estimateWeight(age, gender)
  const height = m.height || estimateHeight(age, gender)
  const bmr = computeBMR(weight, height, age, gender)
  const baseDailyCalories = bmr ? Math.round(bmr * SEDENTARY_MULTIPLIER) : estimateDailyCalories(age, gender)
  return {
    ...m,
    age,
    gender,
    weight,
    height,
    baseDailyCalories,
    display_name: m.display_name || m.first_name || m.name || m.full_name || 'Member',
    // True when weight/height (or the calorie target) fell back to age/gender
    // reference estimates rather than real measured data. UI uses this to warn
    // that nutrition figures for this member are approximate.
    isEstimated: estimatedWeight || estimatedHeight || !bmr,
    estimatedFields: {
      weight: estimatedWeight,
      height: estimatedHeight,
      calories: !bmr,
    },
  }
}
