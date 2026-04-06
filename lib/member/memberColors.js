// Shared member color palette — 12 visually distinct colors.
// Always reference this file; never define COLORS inline in components.
export const MEMBER_COLORS = [
  '#2d6e2e', // green
  '#3B82F6', // blue
  '#7C3AED', // violet
  '#EC4899', // pink
  '#b45309', // amber
  '#06B6D4', // cyan
  '#b91c1c', // red
  '#2d6e2e', // emerald
  '#0891B2', // sky
  '#D97706', // orange
  '#9333EA', // purple
  '#059669', // teal
]

export function memberColor(index) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}
