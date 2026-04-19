import { z } from "zod"

/* ============================================================
 * Inputs — questionnaire collected from the user in the sheet.
 * ============================================================ */

export const sexSchema = z.enum(["male", "female", "other"])
export const heightUnitSchema = z.enum(["cm", "in"])
export const weightUnitSchema = z.enum(["kg", "lb"])

export const experienceSchema = z.enum(["none", "1y", "3y", "5y+"])
export const sportSchema = z.enum(["football", "running", "gym", "basketball", "cycling", "other", "none"])
export const dominantFootSchema = z.enum(["left", "right", "both"])
export const footballPositionSchema = z.enum([
  "goalkeeper",
  "defender",
  "midfielder",
  "winger",
  "striker",
])

export const primaryGoalSchema = z.enum([
  "strength",
  "power",
  "hypertrophy",
  "endurance",
  "fat-loss",
  "sport-specific",
  "general-fitness",
])
export const secondaryGoalSchema = primaryGoalSchema

export const equipmentSchema = z.enum([
  "bodyweight",
  "full-gym",
  "cardio-machines",
])

export const daysPerWeekSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal("auto"),
])

export const planLengthUnitSchema = z.enum(["days", "weeks", "months"])

/**
 * `planLength` becomes a `{ unit, value }` pair so the user can pick the
 * scale that fits their goal (e.g. 14 days, 8 weeks, or 3 months).
 *
 * Allowed ranges per unit:
 *  - days:   7 .. 90
 *  - weeks:  1 .. 24
 *  - months: 1 .. 12
 *  - "auto" (with value=0) lets the AI choose.
 */
export const planLengthSchema = z.object({
  unit: planLengthUnitSchema.or(z.literal("auto")),
  value: z.number().int().min(0).max(365),
})

export const aiPlanInputsSchema = z.object({
  /** Optional first name shown in the app (e.g. "Ruspil"). Trimmed by the form. */
  firstName: z.string().trim().min(1).max(40).optional(),
  sex: sexSchema,
  age: z.number().int().min(10).max(99),
  heightValue: z.number().min(50).max(260),
  heightUnit: heightUnitSchema,
  weightValue: z.number().min(20).max(400),
  weightUnit: weightUnitSchema,

  experience: experienceSchema,
  sport: sportSchema,
  sportFreeText: z.string().max(60).optional(),
  footballPosition: footballPositionSchema.optional(),
  dominantFoot: dominantFootSchema.optional(),

  primaryGoal: primaryGoalSchema,
  secondaryGoals: z.array(secondaryGoalSchema).max(2).default([]),

  equipment: z.array(equipmentSchema).min(1, "Choisis au moins un équipement"),
  injuries: z.string().max(280).optional(),
  sessionLengthMin: z.number().int().min(15).max(120),

  daysPerWeek: daysPerWeekSchema,
  preferredRestDays: z
    .array(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)]))
    .max(7)
    .default([]),

  planLength: planLengthSchema,

  /** Optional bias signal pulled from Helio/freshness storage at submit time. */
  freshnessHint: z
    .object({
      hrvToday: z.number().nullable(),
      hrv7dAvg: z.number().nullable(),
    })
    .optional(),
})

export type AIPlanInputs = z.infer<typeof aiPlanInputsSchema>
export type PlanLength = z.infer<typeof planLengthSchema>

/**
 * Converts a `{ unit, value }` plan length into a number of training weeks.
 * "auto" returns null so the caller (or the AI) picks a sensible default.
 *
 *  - days:   ceil(value / 7), clamped 1..52
 *  - weeks:  value, clamped 1..52
 *  - months: value * 4 (4-week month for programming purposes), clamped 4..52
 */
export function planLengthToWeeks(p: PlanLength): number | null {
  if (p.unit === "auto") return null
  const v = Math.max(1, Math.floor(p.value))
  if (p.unit === "days") return Math.min(52, Math.max(1, Math.ceil(v / 7)))
  if (p.unit === "weeks") return Math.min(52, v)
  if (p.unit === "months") return Math.min(52, v * 4)
  return null
}

/** Human-readable label for the review summary and prompts. */
export function planLengthLabel(p: PlanLength): string {
  if (p.unit === "auto") return "Auto"
  const v = Math.max(1, Math.floor(p.value))
  if (p.unit === "days") return `${v} jour${v > 1 ? "s" : ""}`
  if (p.unit === "weeks") return `${v} semaine${v > 1 ? "s" : ""}`
  if (p.unit === "months") return `${v} mois`
  return "Auto"
}

/* ============================================================
 * Plan — strict schema the AI must produce (JSON only).
 * Optional fields use defaults so partial responses still parse.
 * ============================================================ */

export const aiPlanExerciseSchema = z.object({
  name: z.string().min(1).max(80),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.string().max(20).optional(),
  /** Suggested working load: e.g. "BW", "20kg", "70% 1RM", "RPE 8". Required when meaningful. */
  load: z.string().max(40).optional(),
  rpe: z.number().min(1).max(10).optional(),
  rest: z.string().max(20).optional(),
  notes: z.string().max(200).optional(),
})

export const aiPlanSessionSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["workout", "primer", "cardio", "recovery"]),
  name: z.string().min(1).max(80),
  focus: z.string().min(1).max(80),
  durationMin: z.number().int().min(5).max(240),
  exercises: z.array(aiPlanExerciseSchema).min(1).max(20),
  notes: z.string().max(200).optional(),
})

export const aiPlanDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  label: z.string().min(1).max(40),
  sessions: z.array(aiPlanSessionSchema).min(1).max(3),
})

export const aiPlanWeekSchema = z.object({
  week: z.number().int().min(1).max(60),
  theme: z.string().min(1).max(120),
  deload: z.boolean().optional(),
  days: z.array(aiPlanDaySchema).min(1).max(7),
})

export const aiPlanSchema = z.object({
  id: z.string().min(1).max(80),
  createdAt: z.string().min(1),
  inputs: aiPlanInputsSchema,
  totalWeeks: z.number().int().min(1).max(60),
  daysPerWeek: z.number().int().min(1).max(7),
  weeks: z.array(aiPlanWeekSchema).min(1).max(60),
  coachingSummary: z.string().min(1).max(800),
  citations: z.array(z.string().max(200)).max(8).optional(),
})

export type AIPlan = z.infer<typeof aiPlanSchema>
export type AIPlanWeek = z.infer<typeof aiPlanWeekSchema>
export type AIPlanDay = z.infer<typeof aiPlanDaySchema>
export type AIPlanSession = z.infer<typeof aiPlanSessionSchema>
export type AIPlanExercise = z.infer<typeof aiPlanExerciseSchema>

/** Minimal plan emitted by the AI (no `id`, no `createdAt`, no `inputs` — we add these client-side). */
export const aiPlanFromModelSchema = aiPlanSchema.omit({
  id: true,
  createdAt: true,
  inputs: true,
})

export type AIPlanFromModel = z.infer<typeof aiPlanFromModelSchema>
