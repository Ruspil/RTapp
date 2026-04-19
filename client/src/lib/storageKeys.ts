/**
 * Centralized list of every `trainhard-*` localStorage key the app uses.
 * Used by the "Réinitialiser" feature so wiping never leaves orphan keys.
 *
 * Keep this in sync when adding new keys. Theme (`theme`) and unprefixed
 * keys (`userAge`, `completedExercises`) are intentionally tracked here too
 * because they belong to the same user state.
 */
export const KNOWN_STORAGE_KEYS = [
  // Core program / progress
  "trainhard-user",
  "trainhard-completed",
  "trainhard-current-week",
  "trainhard-program-start-iso",

  // Sound
  "trainhard-sfx-enabled",
  "trainhard-sfx-volume",

  // Freshness / HRV / Helio Strap
  "trainhard-freshness-log",
  "trainhard-freshness-auto-adjust",
  "trainhard-hrv-today",
  "trainhard-hrv-history",

  // Auth (local cache only)
  "trainhard-auth-token",

  // Lift baselines / cardio history
  "trainhard-lift-baselines-lb",
  "trainhard-lift-session-log",
  "trainhard-lift-use-kg",
  "trainhard-lift-suggestions",
  "trainhard-plank-both-sides",
  "trainhard-cardio-history",

  // AI personal plan
  "trainhard-ai-plan",
  "trainhard-ai-plan-inputs",
  "trainhard-active-program",
  "trainhard-ai-plan-cache",

  // Misc app state
  "userAge",
  "completedExercises",
] as const

export type KnownStorageKey = (typeof KNOWN_STORAGE_KEYS)[number]

/**
 * Wipes every known key from localStorage. Theme is preserved by default
 * (visual preference, unrelated to training data).
 */
export function wipeAllTrainhardKeys(opts?: { wipeTheme?: boolean }): void {
  for (const key of KNOWN_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
  if (opts?.wipeTheme) {
    try {
      localStorage.removeItem("theme")
    } catch {
      /* ignore */
    }
  }
}
