export function estimateGL(nutrition) {
  if (!nutrition) return { gl: 0, color: '#10B981' };
  const carbs = nutrition.carbs_absorbed || nutrition.carbs_total || 0;
  const fiber = nutrition.fiber || 0;
  let gi = 70;
  if (fiber > 5) gi -= 15;
  if (fiber > 10) gi -= 10;
  const gl = (gi * carbs) / 100;
  const color = gl < 10 ? '#10B981' : gl < 20 ? '#b45309' : '#b91c1c';
  const label = gl < 10 ? 'Low' : gl < 20 ? 'Medium' : 'High';
  return { gl: Math.round(gl * 10) / 10, color, label };
}
