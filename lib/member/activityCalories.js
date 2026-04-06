const API_URL = '/api/grok';

/**
 * Estimate calories burned from a free-text activity description using Claude Haiku.
 * @param {string} activityText  - e.g. "ran 5km", "gym workout"
 * @param {number} timeMinutes   - duration in minutes
 * @param {object} member        - { weight, gender, age }
 * @returns {Promise<number|null>} calories burned, or null on failure
 */
export async function estimateCaloriesFromActivity(activityText, timeMinutes, member) {
  if (!activityText?.trim() || !timeMinutes || timeMinutes <= 0) return null;

  const weightStr = member.weight ? `${member.weight}kg` : '70kg';
  const userContent =
    `Estimate calories burned for this activity and respond with ONLY a single integer.\n\n` +
    `Person: ${weightStr}, ${member.gender || 'male'}, age ${member.age || 30}\n` +
    `Activity: ${activityText}\n` +
    `Duration: ${timeMinutes} minutes\n\n` +
    `Reply with just the number, e.g.: 320`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 16,
        messages: [
          { role: 'system', content: 'You are a fitness calorie estimator. Always reply with only a plain integer number representing calories burned. No units, no explanation.' },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Activity estimate API error:', response.status, err);
      return null;
    }

    const data = await response.json();
    const caloriesText = (data.text || '').trim();
    console.log('Activity estimate raw response:', caloriesText);
    const calories = parseFloat(caloriesText);

    if (isNaN(calories) || calories <= 0) {
      console.error('Non-numeric calorie response:', caloriesText);
      return null;
    }

    return Math.round(calories);
  } catch (error) {
    console.error('Error estimating calories:', error);
    return null;
  }
}
