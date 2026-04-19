import type { AIPlanExercise, AIPlanWeek } from "./schema"

/**
 * Builds a new week by copying a base week and applying automatic
 * progression / deload rules. The output is marked with `notes` containing
 * "[auto]" so the UI can badge it as extrapolated.
 *
 * Progression heuristic (per week shift `n` from base):
 *  - sets:   +1 every 2 weeks, capped at +2 over base.
 *  - load:   +2.5% if "X% 1RM"; +2.5kg compound / +1kg isolation if "Nkg";
 *            +0.5 RPE per 2 weeks if "RPE N"; "BW" untouched (add tempo cue).
 *  - reps:   leave as-is; the structure cycles via load/RPE.
 * Deload (`isDeload === true`): halve sets, drop load ~15%, lower RPE by 2.
 */
export function extrapolateWeek(
  base: AIPlanWeek,
  newWeekNo: number,
  totalWeeks: number,
  isDeload: boolean,
  theme: string,
): AIPlanWeek {
  const shift = Math.max(0, newWeekNo - base.week)
  const planId = base.days[0]?.sessions[0]?.id?.split(":w")[0] ?? "ai"

  const newDays = base.days.map((d) => ({
    day: d.day,
    label: d.label,
    sessions: d.sessions.map((s, sIdx) => ({
      ...s,
      id: `${planId}:w${newWeekNo}:d${d.day}:s${sIdx}`,
      exercises: s.exercises.map((e) => progressExercise(e, shift, isDeload)),
      notes: combineNotes(s.notes, isDeload ? "[auto · deload]" : "[auto]"),
    })),
  }))

  return {
    week: newWeekNo,
    theme,
    deload: isDeload || undefined,
    days: newDays,
  }
}

/* ------------------------------------------------------------------ helpers */

const COMPOUND_KEYWORDS = [
  "squat",
  "deadlift",
  "bench",
  "press",
  "row",
  "pull-up",
  "pullup",
  "dip",
  "clean",
  "snatch",
  "lunge",
  "rdl",
  "hip thrust",
]

function isCompound(name: string): boolean {
  const lower = name.toLowerCase()
  return COMPOUND_KEYWORDS.some((k) => lower.includes(k))
}

function progressExercise(e: AIPlanExercise, shift: number, isDeload: boolean): AIPlanExercise {
  if (shift === 0 && !isDeload) return e

  const next: AIPlanExercise = { ...e }

  // Sets: +1 every 2 weeks, max +2 (skip on deload).
  if (typeof e.sets === "number") {
    if (isDeload) next.sets = Math.max(1, Math.ceil(e.sets / 2))
    else next.sets = e.sets + Math.min(2, Math.floor(shift / 2))
  }

  // Load progression.
  if (e.load) next.load = progressLoad(e.load, shift, isDeload, isCompound(e.name))

  // RPE progression.
  if (typeof e.rpe === "number") {
    if (isDeload) next.rpe = Math.max(4, e.rpe - 2)
    else next.rpe = Math.min(10, e.rpe + Math.min(1, Math.floor(shift / 2) * 0.5))
  }

  return next
}

function progressLoad(load: string, shift: number, isDeload: boolean, compound: boolean): string {
  // "X% 1RM"
  const pct = load.match(/^(\d+(?:\.\d+)?)\s*%/)
  if (pct) {
    const base = parseFloat(pct[1])
    let target = isDeload ? base * 0.85 : base + 2.5 * shift
    target = Math.max(40, Math.min(95, target))
    return `${Math.round(target)}% 1RM`
  }

  // "Nkg" or "Nlb"
  const abs = load.match(/^(\d+(?:\.\d+)?)\s*(kg|lb)\b/i)
  if (abs) {
    const base = parseFloat(abs[1])
    const unit = abs[2].toLowerCase()
    const stepKg = compound ? 2.5 : 1
    const stepLb = compound ? 5 : 2.5
    const step = unit === "kg" ? stepKg : stepLb
    let target = isDeload ? base * 0.85 : base + step * shift
    target = Math.max(0, Math.round(target * 2) / 2)
    return `${target}${unit}`
  }

  // "RPE N"
  const rpe = load.match(/^RPE\s*(\d+(?:\.\d+)?)/i)
  if (rpe) {
    const base = parseFloat(rpe[1])
    let target = isDeload ? Math.max(4, base - 2) : Math.min(10, base + 0.5 * Math.floor(shift / 2))
    target = Math.round(target * 2) / 2
    return `RPE ${target}`
  }

  // "BW" — unchanged (the model can add tempo if needed; we keep it simple).
  return load
}

function combineNotes(existing: string | undefined, tag: string): string {
  if (!existing) return tag
  if (existing.includes(tag)) return existing
  return `${existing} · ${tag}`
}

/**
 * Returns true if a session in this week was extrapolated (used for UI badge).
 */
export function isExtrapolatedWeek(week: AIPlanWeek): boolean {
  return week.days.some((d) => d.sessions.some((s) => s.notes?.includes("[auto]")))
}
