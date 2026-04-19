import type { Program, Session, WorkoutDay, WorkoutExercise } from "@/lib/workoutData"
import type { AIPlan, AIPlanExercise, AIPlanSession } from "./schema"

/**
 * Transforms an AI-generated session into the existing `Session` shape used
 * by Program Home / WorkoutDetails / ActiveWorkout, so the rest of the app
 * doesn't need to know it came from the AI plan.
 *
 * Session IDs are namespaced as `ai:<planId>:w<n>:d<m>:s<i>` so they cannot
 * collide with the static program's `*-w<n>` IDs.
 */
function toExercise(planId: string, weekNo: number, dayNo: number, idx: number, e: AIPlanExercise): WorkoutExercise {
  // Best-effort split of the AI's `load` string into a numeric value + unit
  // for the existing UI fields. If we can't parse cleanly, dump the raw load
  // into `weight` so the user still sees it (e.g. "70% 1RM" or "RPE 8").
  let weight = e.load ?? ""
  let weightUnit = ""
  if (e.load) {
    const m = e.load.match(/^(\d+(?:\.\d+)?)\s*(kg|lb|lbs)?\b/i)
    if (m) {
      weight = m[1]
      weightUnit = (m[2] ?? "").toLowerCase().replace("lbs", "lb")
    }
  }
  return {
    id: `ai:${planId}:w${weekNo}:d${dayNo}:e${idx}`,
    name: e.name,
    weight,
    weightUnit,
    reps: e.reps ?? "",
    repsLabel: e.reps && /\d+s$/.test(e.reps) ? "TIME" : "REPS",
    sets: e.sets ?? 3,
    group: 1,
    restSeconds: parseRestSeconds(e.rest),
    notes: [e.load && !weightUnit ? `Load: ${e.load}` : null, e.notes].filter(Boolean).join(" · ") || undefined,
  }
}

function parseRestSeconds(rest: string | undefined): number {
  if (!rest) return 60
  const trimmed = rest.trim().toLowerCase()
  const m = trimmed.match(/^(\d+)\s*(s|sec|secondes?|m|min|minutes?)?$/)
  if (!m) return 60
  const n = parseInt(m[1] ?? "60", 10)
  if (Number.isNaN(n)) return 60
  const unit = m[2] ?? "s"
  if (unit.startsWith("m")) return n * 60
  return n
}

function toSession(planId: string, weekNo: number, dayNo: number, sIdx: number, s: AIPlanSession): Session {
  return {
    id: `ai:${planId}:w${weekNo}:d${dayNo}:s${sIdx}`,
    type: s.type === "primer" ? "primer" : "workout",
    name: s.name,
    duration: s.durationMin,
    exercises: s.exercises.map((e, i) => toExercise(planId, weekNo, dayNo, i, e)),
  }
}

/**
 * Builds a `Program`-shaped object from the AI plan for a given week.
 * Pads to 5 day-slots so the existing day-tabs UI keeps working when the
 * user picks fewer training days. Empty days expose a placeholder rest
 * session (kept inactive — no exercises) to avoid `undefined` lookups.
 */
export function aiPlanToProgram(plan: AIPlan, weekNumber: number): Program {
  const w = Math.min(Math.max(weekNumber, 1), plan.totalWeeks)
  const week = plan.weeks.find((x) => x.week === w) ?? plan.weeks[0]

  const dayMap = new Map<number, WorkoutDay>()
  for (const d of week.days) {
    dayMap.set(d.day, {
      day: d.day,
      sessions: d.sessions.map((s, i) => toSession(plan.id, week.week, d.day, i, s)),
    })
  }

  const minDays = Math.max(plan.daysPerWeek, 1)
  const days: WorkoutDay[] = []
  for (let i = 1; i <= Math.max(minDays, 5); i++) {
    const existing = dayMap.get(i)
    if (existing) {
      days.push(existing)
    } else {
      days.push({
        day: i,
        sessions: [
          {
            id: `ai:${plan.id}:w${week.week}:d${i}:rest`,
            type: "primer",
            name: "Repos / Récupération active",
            duration: 0,
            exercises: [],
          },
        ],
      })
    }
  }

  return {
    id: `ai-program-${plan.id}-w${w}`,
    ownerName: "AI",
    name: "Plan personnalisé (AI)",
    week: `Semaine ${w} / ${plan.totalWeeks} — ${week.theme}${week.deload ? " · Deload" : ""}`,
    totalWeeks: plan.totalWeeks,
    days,
  }
}
