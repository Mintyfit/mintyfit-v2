import { useAuth } from '@/contexts/AuthContext'
import { canUsePhotoFoodLog } from '@/lib/usageLimits'

export function useSubscription() {
  const { profile } = useAuth()
  const tier = profile?.subscription_tier || 'free'

  // AI generation is available to all logged-in users.
  // Access is controlled by daily usage limits in usageLimits.js, not by tier.
  const canUseAI = true
  const isPro = tier === 'pro' || tier === 'nutritionist'
  const isNutritionistPlan = tier === 'nutritionist'
  const isFamily = tier === 'family'
  const canUsePhotoLog = canUsePhotoFoodLog(tier)

  return { tier, canUseAI, isPro, isNutritionistPlan, isFamily, canUsePhotoLog }
}
