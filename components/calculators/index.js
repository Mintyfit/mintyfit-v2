// Calculator registry - maps calculator slugs to components
import WaterCalculator from './WaterCalculator'
import VitaminD3Calculator from './VitaminD3Calculator'

export const CALCULATORS = {
  'water-calculator': {
    slug: 'water-calculator',
    name: 'Water Intake Calculator',
    component: WaterCalculator,
    description: 'Calculate your daily water intake needs',
  },
  'vitamin-d3-calculator': {
    slug: 'vitamin-d3-calculator',
    name: 'Vitamin D3 Calculator',
    component: VitaminD3Calculator,
    description: 'Estimate your vitamin D3 supplementation needs',
  },
}

export function getCalculatorBySlug(slug) {
  return CALCULATORS[slug] || null
}

export function getCalculatorList() {
  return Object.values(CALCULATORS)
}
