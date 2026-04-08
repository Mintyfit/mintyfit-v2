import PricingClient from '@/components/pricing/PricingClient'

export const metadata = {
  title: 'Pricing — MintyFit Family Nutrition',
  description: 'Start free, upgrade when you\'re ready. MintyFit Pro gives your whole family unlimited AI-generated recipes and personalized nutrition tracking.',
  openGraph: {
    title: 'MintyFit Pricing — Family Nutrition Plans',
    description: 'Free, Pro, and Family plans. Personalized nutrition for every family member.',
    type: 'website',
  },
  alternates: { canonical: '/pricing' },
}

export default function PricingPage() {
  return <PricingClient />
}
