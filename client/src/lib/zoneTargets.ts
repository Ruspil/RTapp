import type { WorkoutExercise } from "@/lib/workoutData"

export interface ZoneTarget {
  minZ: number
  maxZ: number
}

/**
 * Parse notes like "Zone FC: Z3-Z4", "Z5", "Z2-Z3", "Z1-Z2".
 */
export function parseTargetZonesFromNotes(notes: string | undefined): ZoneTarget | null {
  if (!notes) return null
  const u = notes.toUpperCase()

  const range = u.match(/Z\s*(\d)\s*-\s*Z\s*(\d)/i) ?? u.match(/Z(\d)\s*-\s*Z(\d)/)
  if (range) {
    const a = Number(range[1])
    const b = Number(range[2])
    return { minZ: Math.min(a, b), maxZ: Math.max(a, b) }
  }

  const single = u.match(/\bZ\s*(\d)\b/)
  if (single) {
    const z = Number(single[1])
    return { minZ: z, maxZ: z }
  }

  return null
}

function isCardioExercise(ex: WorkoutExercise): boolean {
  return ex.muscles?.includes("Cardio") ?? false
}

function defaultZonesForCardio(ex: WorkoutExercise): ZoneTarget {
  const name = ex.name.toUpperCase()
  const n = ex.notes?.toUpperCase() ?? ""
  if (/SPRINT|RSA|VO2|MAX|95%|Z5/i.test(name + n)) return { minZ: 4, maxZ: 5 }
  if (/Z2|CONVERSATION|LÉGER|TROT|WALK|RÉCUP/i.test(name + n)) return { minZ: 2, maxZ: 3 }
  return { minZ: 3, maxZ: 4 }
}

export function getTargetZonesForExercise(ex: WorkoutExercise): ZoneTarget | null {
  const parsed = parseTargetZonesFromNotes(ex.notes)
  if (parsed) return parsed
  if (isCardioExercise(ex)) return defaultZonesForCardio(ex)
  return null
}

export type ZoneSeconds = { 1: number; 2: number; 3: number; 4: number; 5: number }

/**
 * Fraction of HR session time spent inside [minZ, maxZ] (uses zoneSeconds from hook).
 */
export function fractionTimeInTarget(zoneSeconds: ZoneSeconds, target: ZoneTarget): number {
  let inT = 0
  let total = 0
  for (let z = 1; z <= 5; z++) {
    const s = zoneSeconds[z as keyof ZoneSeconds] ?? 0
    total += s
    if (z >= target.minZ && z <= target.maxZ) inT += s
  }
  if (total <= 0) return 0
  return inT / total
}

export function feedbackCopy(pct: number, target: ZoneTarget): string {
  if (pct >= 0.55) return `Mostly in Z${target.minZ}–Z${target.maxZ} as prescribed.`
  if (pct >= 0.3) return `Partly in target zones Z${target.minZ}–Z${target.maxZ} — adjust pace next time.`
  return `Little time in Z${target.minZ}–Z${target.maxZ} vs this block — check effort or max HR setting.`
}
