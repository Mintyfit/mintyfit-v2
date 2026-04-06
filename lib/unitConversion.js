// ─── Height ───────────────────────────────────────────────────────────────────

export function cmToFtIn(cm) {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) };
}

export function ftInToCm(ft, inches) {
  return (parseFloat(ft) * 12 + parseFloat(inches)) * 2.54;
}

/** Display a height stored in cm */
export function formatHeight(cm, isMetric) {
  if (!cm) return '—';
  if (isMetric) return `${Math.round(cm)} cm`;
  const { ft, inches } = cmToFtIn(cm);
  return `${ft}'${inches}"`;
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export const kgToLbs = (kg) => kg * 2.20462;
export const lbsToKg = (lbs) => lbs / 2.20462;

/** Display a weight stored in kg */
export function formatWeight(kg, isMetric) {
  if (!kg) return '—';
  if (isMetric) return `${Number(kg).toFixed(1)} kg`;
  return `${Math.round(kgToLbs(kg))} lbs`;
}

// ─── Circumference (waist, hip, etc.) ────────────────────────────────────────

/** Convert cm to decimal inches */
export const cmToIn = (cm) => cm / 2.54;
export const inToCm = (inches) => inches * 2.54;

/** Display a length stored in cm */
export function formatLength(cm, isMetric) {
  if (!cm) return '—';
  if (isMetric) return `${Math.round(cm)} cm`;
  return `${(cmToIn(cm)).toFixed(1)}"`;
}

// ─── Ingredient units ─────────────────────────────────────────────────────────

export function convertIngredientUnit(amount, unit, isMetric) {
  if (isMetric || !amount) return { amount, unit };
  const u = unit?.toLowerCase();
  if (u === 'g')  { const oz = amount / 28.35;  return oz >= 16 ? { amount: oz / 16,   unit: 'lb'    } : { amount: oz,  unit: 'oz'    }; }
  if (u === 'kg') {                               return { amount: amount * 2.20462,     unit: 'lb'    }; }
  if (u === 'ml') { const fl = amount / 29.5735; return fl >= 8  ? { amount: fl / 8,   unit: 'cup'   } : { amount: fl,  unit: 'fl oz' }; }
  if (u === 'l')  {                               return { amount: amount * 4.22675,     unit: 'cup'   }; }
  return { amount, unit };
}

export const METRIC_UNITS   = ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cup', 'piece', 'handful', 'bunch', 'clove', 'slice', 'pinch'];
export const IMPERIAL_UNITS = ['oz', 'lb', 'fl oz', 'cup', 'tbsp', 'tsp', 'piece', 'handful', 'bunch', 'clove', 'slice', 'pinch'];

export const getIngredientUnits = (isMetric) =>
  isMetric ? METRIC_UNITS : IMPERIAL_UNITS;

// ─── Measurement form helpers ─────────────────────────────────────────────────

/**
 * Convert a DB value (kg or cm) to the display value for a field.
 * @param {number} dbValue  value as stored in DB
 * @param {'weight_kg'|'height_cm'|'waist_cm'|'hip_cm'} field
 * @param {boolean} isMetric
 */
export function dbToDisplay(dbValue, field, isMetric) {
  if (!dbValue && dbValue !== 0) return '';
  if (isMetric) return String(dbValue);
  if (field === 'weight_kg') return String(Math.round(kgToLbs(dbValue) * 10) / 10);
  // height_cm, waist_cm, hip_cm → inches
  return String(Math.round(cmToIn(dbValue) * 10) / 10);
}

/**
 * Convert a display value (entered by user) back to DB units.
 * @param {string} displayValue
 * @param {'weight_kg'|'height_cm'|'waist_cm'|'hip_cm'} field
 * @param {boolean} isMetric
 */
export function displayToDb(displayValue, field, isMetric) {
  const v = parseFloat(displayValue);
  if (isNaN(v)) return null;
  if (isMetric) return v;
  if (field === 'weight_kg') return Math.round(lbsToKg(v) * 100) / 100;
  return Math.round(inToCm(v) * 100) / 100;
}

/** Label text for a measurement field */
export function fieldLabel(field, isMetric) {
  const MAP_METRIC   = { weight_kg: 'Weight (kg)',  height_cm: 'Height (cm)', waist_cm: 'Waist (cm)',  hip_cm: 'Hip (cm)' };
  const MAP_IMPERIAL = { weight_kg: 'Weight (lbs)', height_cm: 'Height (in)', waist_cm: 'Waist (in)',  hip_cm: 'Hip (in)' };
  return (isMetric ? MAP_METRIC : MAP_IMPERIAL)[field] || field;
}
