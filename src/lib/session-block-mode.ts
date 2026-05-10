/**
 * Session condition convention:
 * - `allowedMinutes === 0` → full-session block (no periodic unlock windows).
 * - `intervalHours` is kept as a positive placeholder for schema / legacy shape.
 */
export const FULL_BLOCK_ALLOWED_MINUTES = 0;
export const FULL_BLOCK_INTERVAL_HOURS = 1;

export function fullBlockConditionFields() {
  return {
    allowedMinutes: FULL_BLOCK_ALLOWED_MINUTES,
    intervalHours: FULL_BLOCK_INTERVAL_HOURS,
  } as const;
}
