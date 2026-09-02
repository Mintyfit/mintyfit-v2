/**
 * planCache — shared access to the planner's localStorage week cache.
 *
 * The planner (components/planner/PlannerClient.jsx) caches week data under
 * `mintyfit:plan:week:{userId}:{familyId|solo|client}:{startKey}:{endKey}`
 * with a 30-min TTL. Any write that happens OUTSIDE the planner (e.g. Minty
 * Chat journal logging) must bust this cache and/or dispatch
 * JOURNAL_SAVED_EVENT, otherwise the planner keeps showing stale data.
 */

export const PLAN_CACHE_PREFIX = 'mintyfit:plan:'

/** Window event dispatched after a food_journal row is written outside the planner. */
export const JOURNAL_SAVED_EVENT = 'mintyfit:journal-saved'

/** Drop all cached planner weeks for a user so the next mount refetches. */
export function bustPlanWeekCache(userId) {
  if (!userId) return
  try {
    const prefix = `${PLAN_CACHE_PREFIX}week:${userId}:`
    const toDelete = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(prefix)) toDelete.push(k)
    }
    toDelete.forEach(k => localStorage.removeItem(k))
  } catch {}
}
