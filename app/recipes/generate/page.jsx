import RecipeGeneratorClient from '@/components/recipes/RecipeGeneratorClient'

export const metadata = {
  title: 'Generate a Recipe — MintyFit',
  description: 'Describe what you want to eat and let AI create a personalized recipe with full nutrition data.',
}

export default function GeneratePage() {
  return <RecipeGeneratorClient />
}
