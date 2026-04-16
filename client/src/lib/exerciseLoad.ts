import type { WorkoutExercise } from "@/lib/workoutData"

/** Strip week suffix from ids like `back-squat-w3` → `back-squat`. */
export function canonicalExerciseId(exerciseId: string): string {
  return exerciseId.replace(/-w\d+$/i, "")
}

export type LoadKind = "percent1rm" | "absolute_load" | "bodyweight" | "other"

export function classifyLoad(ex: WorkoutExercise): LoadKind {
  const w = ex.weight.trim()
  const wu = ex.weightUnit.trim()
  if (w.toUpperCase() === "BW") return "bodyweight"
  if (wu === "1RM" || /%/.test(w)) return "percent1rm"
  if (/^(Modéré|Lourd|Léger|Très Lourd|Modéré-Lourd)/i.test(w) || /Modéré|Lourd|Léger/i.test(w)) {
    return "absolute_load"
  }
  return "other"
}

/** True when we should offer lbs logging and %→lb conversion (not BW-only). */
export function isLoadBearing(ex: WorkoutExercise): boolean {
  const k = classifyLoad(ex)
  return k === "percent1rm" || k === "absolute_load"
}

/**
 * Parse "70-75%", "60%", "85-90%" → low/high percent of 1RM.
 */
export function parsePercentRange(weight: string): { low: number; high: number } | null {
  const s = weight.trim()
  const range = s.match(/(\d+)\s*-\s*(\d+)\s*%/)
  if (range) {
    return { low: Number(range[1]), high: Number(range[2]) }
  }
  const single = s.match(/(\d+)\s*%/)
  if (single) {
    const v = Number(single[1])
    return { low: v, high: v }
  }
  return null
}

export function lbsFromPercent(oneRmLb: number, pct: number): number {
  return Math.round((oneRmLb * pct) / 100)
}

/** Map canonical exercise id → single baseline key for 1RM (expand over time). */
export function baselineKeyForExercise(canonicalId: string): string {
  if (canonicalId.startsWith("back-squat")) return "back_squat"
  if (canonicalId.includes("db-bench")) return "db_bench"
  if (canonicalId.includes("rdl") || canonicalId.includes("deadlift")) return "rdl"
  return canonicalId.replace(/[^a-z0-9]+/gi, "_").toLowerCase()
}
