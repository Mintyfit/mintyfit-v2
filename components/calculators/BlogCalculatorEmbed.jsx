'use client'

import { getCalculatorBySlug } from './index'

export default function BlogCalculatorEmbed({ slug }) {
  const calculator = getCalculatorBySlug(slug)
  
  if (!calculator) {
    return (
      <div style={{
        padding: '24px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        textAlign: 'center',
        margin: '24px 0',
      }}>
        <p style={{ color: '#dc2626', fontWeight: 600 }}>Calculator not found: {slug}</p>
      </div>
    )
  }

  const CalculatorComponent = calculator.component
  
  return (
    <div style={{ margin: '32px 0' }}>
      <CalculatorComponent />
    </div>
  )
}
