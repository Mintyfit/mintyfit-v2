/**
 * toDateKey — canonical local-date key (YYYY-MM-DD) used across planner,
 * statistics, journal. THE ONLY copy in the codebase (16 copies existed).
 */
export function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}
