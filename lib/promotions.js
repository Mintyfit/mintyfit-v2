'use client'

import { createClient } from '@/lib/supabase/client'

export async function getActivePromotion() {
  const supabase = createClient()
  if (!supabase) return null
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) { console.warn('getActivePromotion error:', error.message); return null }
  return data || null
}

export function applyDiscount(originalPrice, discountPercent) {
  return Math.round(originalPrice * (1 - discountPercent / 100) * 100) / 100
}

export function daysRemaining(promotion) {
  if (!promotion?.end_date) return null
  const end  = new Date(promotion.end_date + 'T23:59:59')
  const now  = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}
