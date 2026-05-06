# Activity Nutrient Expenditure Study

**Created:** 2026-04-28  
**Priority:** High  
**Status:** Research phase  
**Owner:** Development team

## Goal

Implement accurate calculation of micronutrient loss during physical activities to answer: *"How much zinc/magnesium/iron is needed to restore after a 1 hour running session?"*

## Current State

- Activities currently track only calories burned
- No micronutrient expenditure calculation exists
- User requirement: activities should influence all 47 nutrients tracked in the system

## Research Findings (2026-04-28)

### Scientific Basis

Multiple peer-reviewed studies provide data on micronutrient loss during exercise:

| Nutrient | Key Findings | Sources |
|----------|--------------|---------|
| **Zinc** | 2hr cycling @ 50% VO2max: ~1.5-2.0 mg lost (9% RDA men, 8% women) | DeRuisseau 2002, IJSNEM |
| **Iron** | 2hr cycling @ 50% VO2max: ~0.5-1.0 mg lost (3% RDA men, 1% women) | DeRuisseau 2002 |
| **Magnesium** | 8hr exercise in heat (100°F): 15.2-17.8 mg lost (4-5% daily intake) | Nielsen & Lukaski 2006 |
| **Vitamin B6** | Marathon: ~1 mg loss | Rokitzki 1994 |
| **B-Vitamins** | Exercise increases B6 excretion as 4-pyridoxic acid | Manore 2000 |

### Key Variables Affecting Loss

1. **Sweat rate** — primary driver of mineral loss (400-2500 ml/hr based on intensity)
2. **Exercise duration** — linear relationship with total loss
3. **Exercise intensity** — affects sweat rate and concentration
4. **Environmental conditions** — heat increases sweat rate significantly
5. **Individual factors** — genetics, training status, climate adaptation

### No Established Formulas

**Critical finding:** No validated universal formulas exist for micronutrient expenditure calculation. Current research provides:
- Snapshot measurements from specific studies
- Sweat concentration ranges
- Percentage of RDA lost in specific conditions

**No API or library** provides this calculation out-of-the-box.

## Implementation Approach

### Phase 1: Simplified Estimation Model

Base calculation on **sweat rate estimation** with conservative concentration values:

```javascript
// Sweat rate by intensity (ml/hr)
const SWEAT_RATE = {
  walking: 400-600,
  moderate: 600-1000,    // jogging, light cycling
  high: 1000-1500,       // running, HIIT
  extreme: 1500-2500,    // marathon, intense endurance
}

// Mineral concentrations in sweat (mg/L)
const SWEAT_CONCENTRATIONS = {
  zinc: 0.65,        // midpoint of 0.5-0.8
  iron: 0.3,         // estimated from RDA loss studies
  magnesium: 2.0,    // midpoint of observed range
  // ... other minerals
}

// Calculation
const mineralLoss_mg = (sweatRate_mLhr / 1000) * concentration_mgL * duration_hr
```

### Phase 2: Activity Type Mapping

Map activity types to intensity levels:

| Activity Type | Intensity Level | Sweat Rate (ml/hr) |
|---------------|-----------------|-------------------|
| Walking | Low | 500 |
| Yoga, Pilates, Stretching | Low | 400 |
| Weight Training | Moderate | 700 |
| Dancing | Moderate | 600 |
| Cycling | Moderate-High | 900 |
| Swimming | Moderate-High | 800 (water cooling reduces sweat) |
| Hiking | Moderate-High | 800 |
| Running | High | 1200 |
| HIIT | High | 1300 |
| Sports (soccer, basketball) | High | 1100 |

### Phase 3: B-Vitamin Estimation

B-vitamin loss is less quantified. Use conservative estimates based on increased turnover:

| Vitamin | Estimation Approach |
|---------|---------------------|
| B1 (Thiamine) | +10% of RDA per hour moderate exercise |
| B2 (Riboflavin) | +15% of RDA per hour |
| B3 (Niacin) | +12% of RDA per hour |
| B6 | 0.1-0.2 mg per hour (based on marathon data) |
| B12 | Minimal acute loss |
| Folate | Minimal acute loss |

## Implementation Tasks

### Task 1: Create Activity Nutrient Library
**File:** `lib/nutrition/activityNutrientLoss.js`

```javascript
export function estimateNutrientLoss(activityType, durationMinutes, member) {
  // 1. Determine intensity level from activity type
  // 2. Estimate sweat rate based on intensity + member weight
  // 3. Calculate mineral losses from sweat concentration × sweat volume
  // 4. Estimate B-vitamin losses from duration-based formulas
  // 5. Return { zinc_mg, iron_mg, magnesium_mg, vit_b6_mg, ... }
}
```

### Task 2: Update Activity Form
**File:** `components/planner/ActivityForm.jsx`

- Show estimated nutrient loss after activity is saved
- Display: "This activity burned X kcal and depleted: Y mg zinc, Z mg magnesium..."

### Task 3: Update Macro Breakdown
**File:** `components/planner/DayMacroBreakdown.jsx`

- Replace placeholder with actual nutrient loss display
- Show: "Activity nutrient expenditure" section with key minerals

### Task 4: Update Daily Totals Calculation
**File:** `lib/nutrition/dailyTotals.js`

- Integrate `estimateNutrientLoss()` into `calculateDailyTotals()`
- Add `activityNutrientLoss` to return value
- Adjust net nutrition display

## Validation Strategy

1. **Compare against research data** — ensure estimates fall within published ranges
2. **Conservative bias** — underestimate rather than overestimate (safety margin)
3. **User feedback** — gather feedback from athletes and nutritionists
4. **Iterate** — refine formulas based on new research

## Open Questions

1. Should we account for **training adaptation**? (trained athletes sweat more efficiently)
2. Should we integrate **heart rate data** if available? (more accurate intensity measure)
3. Should we consider **climate/temperature**? (heat dramatically increases sweat rate)
4. Should we show **recovery recommendations**? ("Consume X mg zinc to replenish")

## Recommended Next Steps

1. **Implement Phase 1 simplified model** — conservative estimates based on sweat rate
2. **Add disclaimer** — "Estimates based on average sweat rates; individual variation is significant"
3. **Gather user feedback** — especially from serious athletes
4. **Monitor research** — sports nutrition is evolving; update formulas as new data emerges

## References

- DeRuisseau KC, et al. (2002). "Iron and zinc loss during exercise." *Int J Sport Nutr Exerc Metab* 12:428-437.
- Tipton KD, et al. (1993). "Sweat mineral losses during exercise." *Int J Sport Nutr* 3:261-271.
- Nielsen FH, Lukaski HC. (2006). "Magnesium status and exercise." *Magnesium Education*.
- Terink R, et al. (2017). "Magnesium kinetics during endurance exercise." *Int J Sport Nutr Exerc Metab* 27:264-270.
- Manore MM. (2000). "B-vitamin requirements for exercisers." *Am J Clin Nutr* 72:598S-606S.
- Rokitzki L, et al. (1994). "Vitamin B6 status in marathon runners." *Int J Sport Nutr* 4:154-164.

## Related Files

- `lib/nutrition/dailyTotals.js` — Daily nutrition calculation
- `lib/member/activityCalories.js` — Current activity calorie estimation
- `components/planner/ActivityForm.jsx` — Activity logging UI
- `components/planner/DayMacroBreakdown.jsx` — Macro display component
