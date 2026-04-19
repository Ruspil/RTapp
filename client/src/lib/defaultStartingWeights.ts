export type Phase = 1 | 2 | 3

/**
 * Starting weights per exercise, indexed by phase.
 * [Phase 1 (Moteur), Phase 2 (Chasseur), Phase 3 (Compétition)].
 * Keys match the canonical exercise id used in workoutData.ts.
 */
export const DEFAULT_STARTING_WEIGHTS_LB: Record<string, [number, number, number]> = {
  "back-squat": [210, 235, 250],
  "rdl": [160, 185, 200],
  "db-bench": [110, 125, 135],
  "lat-pulldown": [120, 135, 150],
  "seated-cable-row": [120, 135, 150],
  "lateral-lunge": [50, 65, 75],
  /** Medicine Ball Slams — Phase 1 plage 10–12 lb (valeur médiane 11), P2 15, P3 20 */
  "mb-slams": [11, 15, 20],
}

/**
 * Kettlebell Swings — week-specific (includes deload / taper weeks).
 * S1–S3 Moteur 53 lb | S4 décharge 35 | S5–S7 Chasseur 70 | S8 décharge 44 |
 * S9–S11 Compétition 80 | S12 affûtage 53
 */
export function kbSwingStartingWeightLb(week: number): number {
  const w = Math.min(Math.max(week, 1), 12)
  if (w <= 3) return 53
  if (w === 4) return 35
  if (w <= 7) return 70
  if (w === 8) return 44
  if (w <= 11) return 80
  return 53
}

export function phaseFromWeek(week: number): Phase {
  if (week <= 4) return 1
  if (week <= 8) return 2
  return 3
}

export function defaultStartingWeightLb(canonicalId: string, week: number): number | null {
  if (canonicalId === "kb-swings") return kbSwingStartingWeightLb(week)
  const row = DEFAULT_STARTING_WEIGHTS_LB[canonicalId]
  if (!row) return null
  return row[phaseFromWeek(week) - 1]
}
