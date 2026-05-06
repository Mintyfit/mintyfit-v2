/**
 * Activity Nutrient Expenditure Library
 * 
 * Estimates micronutrient loss during physical activities based on sweat rate
 * and research data. Single source of truth for activity nutrient calculations.
 * 
 * Scientific basis:
 * - Sweat rate by intensity (DeRuisseau 2002, Nielsen & Lukaski 2006)
 * - Mineral concentrations in sweat (Tipton 1993, Terink 2017)
 * - B-vitamin turnover during exercise (Manore 2000, Rokitzki 1994)
 * 
 * All estimates are conservative (underestimate rather than overestimate)
 */

// Sweat rate by intensity level (ml/hr)
// Based on average sweat rates across multiple studies
const SWEAT_RATES = {
  low: 500,       // Walking, Yoga, Stretching, Pilates
  moderate: 700,  // Weight Training, Dancing, Swimming, Hiking
  high: 1200,     // Running, HIIT, Cycling, Sports
}

// Activity type to intensity mapping
const ACTIVITY_INTENSITY = {
  'Walking': 'low',
  'Yoga': 'low',
  'Pilates': 'low',
  'Stretching': 'low',
  'Weight Training': 'moderate',
  'Dancing': 'moderate',
  'Swimming': 'moderate',
  'Hiking': 'moderate',
  'Cycling': 'high',
  'Running': 'high',
  'HIIT': 'high',
  'Sports': 'high',
}

// Mineral concentrations in sweat (mg/L)
// Conservative estimates from peer-reviewed studies
const SWEAT_CONCENTRATIONS = {
  zinc: 0.65,        // DeRuisseau 2002: 0.5-0.8 mg/L
  iron: 0.3,         // Estimated from RDA loss studies
  magnesium: 2.0,    // Nielsen & Lukaski 2006: ~2 mg/L
  calcium: 15.0,     // Major sweat mineral loss
  sodium: 900,       // Primary electrolyte (range 460-1840 mg/L)
  potassium: 200,    // Secondary electrolyte
}

// B-vitamin loss per hour of exercise (mg)
// Based on increased turnover and excretion during physical activity
const B_VITAMIN_LOSS_PER_HOUR = {
  vit_b1: 0.15,    // Thiamine - increased turnover
  vit_b2: 0.18,    // Riboflavin - ~15% RDA per hour
  vit_b3: 2.0,     // Niacin - ~12% RDA per hour
  vit_b6: 0.15,    // Based on marathon data (Rokitzki 1994)
  vit_b12: 0.002,  // Minimal acute loss
  folates: 0.02,   // Minimal acute loss
}

/**
 * Estimate nutrient loss from a single physical activity
 * 
 * Formula:
 *   sweatVolume = sweatRate × (duration / 60) × weightFactor
 *   mineralLoss = sweatVolume × concentration
 *   vitaminLoss = lossPerHour × durationHours
 * 
 * @param {string} activityType - Activity name (e.g. 'Running', 'Cycling')
 * @param {number} durationMinutes - Duration in minutes
 * @param {object} member - Member object with weight_kg, gender, age
 * @returns {Object} Nutrient losses keyed by NUTRITION_FIELDS keys
 */
export function estimateNutrientLoss(activityType, durationMinutes, member) {
  if (!activityType || !durationMinutes || durationMinutes <= 0) {
    return {}
  }

  const intensity = ACTIVITY_INTENSITY[activityType] || 'moderate'
  const baseSweatRate = SWEAT_RATES[intensity] || SWEAT_RATES.moderate
  
  // Adjust sweat rate by weight (heavier individuals typically sweat more)
  const weight = member?.weight_kg || 70
  const weightFactor = weight / 70
  const adjustedSweatRate = baseSweatRate * weightFactor
  
  // Calculate sweat volume in liters
  const durationHours = durationMinutes / 60
  const sweatVolumeL = (adjustedSweatRate / 1000) * durationHours
  
  // Calculate mineral losses from sweat concentration × volume
  const mineralLoss = {}
  for (const [mineral, concentration_mgL] of Object.entries(SWEAT_CONCENTRATIONS)) {
    mineralLoss[mineral] = concentration_mgL * sweatVolumeL
  }
  
  // Calculate B-vitamin losses (duration-based turnover)
  const vitaminLoss = {}
  for (const [vitamin, lossPerHour] of Object.entries(B_VITAMIN_LOSS_PER_HOUR)) {
    vitaminLoss[vitamin] = lossPerHour * durationHours
  }
  
  // Return losses mapped to NUTRITION_FIELDS keys
  return {
    // Minerals (mg)
    zinc: mineralLoss.zinc,
    iron: mineralLoss.iron,
    magnesium: mineralLoss.magnesium,
    calcium: mineralLoss.calcium,
    sodium: mineralLoss.sodium,
    potassium: mineralLoss.potassium,
    
    // Vitamins (mg)
    vit_b1: vitaminLoss.vit_b1,
    vit_b2: vitaminLoss.vit_b2,
    niacin: vitaminLoss.vit_b3,
    vit_b6: vitaminLoss.vit_b6,
    vit_b12: vitaminLoss.vit_b12,
    folates: vitaminLoss.folates,
  }
}

/**
 * Calculate total activity nutrient loss for multiple activities across members
 * 
 * @param {Object} activitiesByMember - { memberId: [activityObj], ... }
 *   Each activityObj: { activity_text, time_minutes, calories }
 * @param {Array} members - Family members array with id, weight_kg, etc.
 * @returns {Object} Aggregated nutrient losses keyed by nutrient key
 */
export function calculateTotalActivityLoss(activitiesByMember, members) {
  const totalLoss = {}
  
  if (!activitiesByMember || !members || members.length === 0) {
    return totalLoss
  }
  
  for (const [memberId, activities] of Object.entries(activitiesByMember)) {
    const member = members.find(m => m.id === memberId)
    
    if (!member || !Array.isArray(activities)) {
      continue
    }
    
    for (const activity of activities) {
      const loss = estimateNutrientLoss(
        activity.activity_text,
        activity.time_minutes,
        member
      )
      
      // Sum losses across all activities
      for (const [key, value] of Object.entries(loss)) {
        if (typeof value === 'number' && value > 0) {
          totalLoss[key] = (totalLoss[key] || 0) + value
        }
      }
    }
  }
  
  return totalLoss
}

/**
 * Get human-readable summary of key nutrient losses
 * 
 * @param {Object} nutrientLoss - Result from estimateNutrientLoss() or calculateTotalActivityLoss()
 * @returns {Array} Array of { label, value, unit } for display, sorted by importance
 */
export function getNutrientLossSummary(nutrientLoss) {
  if (!nutrientLoss) return []
  
  const priorityNutrients = [
    { key: 'zinc', label: 'Zinc', unit: 'mg' },
    { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
    { key: 'iron', label: 'Iron', unit: 'mg' },
    { key: 'calcium', label: 'Calcium', unit: 'mg' },
    { key: 'sodium', label: 'Sodium', unit: 'mg' },
    { key: 'potassium', label: 'Potassium', unit: 'mg' },
    { key: 'vit_b6', label: 'Vitamin B6', unit: 'mg' },
    { key: 'vit_b12', label: 'Vitamin B12', unit: 'mg' },
    { key: 'vit_b1', label: 'Thiamine (B1)', unit: 'mg' },
    { key: 'vit_b2', label: 'Riboflavin (B2)', unit: 'mg' },
    { key: 'niacin', label: 'Niacin (B3)', unit: 'mg' },
    { key: 'folates', label: 'Folate', unit: 'mg' },
  ]
  
  return priorityNutrients
    .map(n => ({
      ...n,
      value: nutrientLoss[n.key] || 0,
    }))
    .filter(n => n.value > 0)
    .sort((a, b) => b.value - a.value)
}

/**
 * Format nutrient value for display with appropriate precision
 * 
 * @param {number} value - Nutrient value
 * @param {string} unit - Unit string
 * @returns {string} Formatted value with unit
 */
export function formatNutrientValue(value, unit) {
  if (value == null || value <= 0) return `0 ${unit}`
  
  // Use appropriate precision based on magnitude
  let formatted
  if (value >= 100) {
    formatted = Math.round(value)
  } else if (value >= 1) {
    formatted = value.toFixed(1)
  } else {
    formatted = value.toFixed(2)
  }
  
  return `${formatted} ${unit}`
}
