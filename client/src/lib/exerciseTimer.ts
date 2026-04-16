import type { WorkoutExercise } from "@/lib/workoutData"

const TIME_LABELS = /SECONDE|MINUTE/i

/**
 * True when prescription is time-based (plank, hold, steady run minutes, etc.).
 */
export function isTimeBasedExercise(ex: WorkoutExercise): boolean {
  return TIME_LABELS.test(ex.repsLabel)
}

/**
 * Default work duration in seconds from `reps` + `repsLabel`.
 * - Ranges like 45-60 + SECONDES → midpoint (52s).
 * - 20-25 + MINUTES → midpoint minutes × 60.
 * - Single number + MINUTES → that many minutes × 60.
 */
export function parseWorkDurationSeconds(ex: WorkoutExercise): number {
  const label = ex.repsLabel.toUpperCase()
  const raw = ex.reps.trim()

  const range = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/)
  if (label.includes("MINUTE")) {
    if (range) {
      const mid = (Number(range[1]) + Number(range[2])) / 2
      return Math.round(mid * 60)
    }
    const single = parseFloat(raw)
    if (!Number.isNaN(single)) return Math.round(single * 60)
  }

  if (label.includes("SEC")) {
    if (range) {
      const a = Number(range[1])
      const b = Number(range[2])
      return Math.round((a + b) / 2)
    }
    const single = parseInt(raw, 10)
    if (!Number.isNaN(single)) return single
  }

  return 60
}
