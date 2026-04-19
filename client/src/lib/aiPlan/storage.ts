import { aiPlanInputsSchema, aiPlanSchema, type AIPlan, type AIPlanInputs } from "./schema"

const PLAN_KEY = "trainhard-ai-plan"
const INPUTS_KEY = "trainhard-ai-plan-inputs"
const ACTIVE_KEY = "trainhard-active-program"

export type ActiveProgram = "static" | "ai"

/* ----------------------------------- AI plan ----------------------------------- */

export function getAIPlan(): AIPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY)
    if (!raw) return null
    const parsed = aiPlanSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function setAIPlan(plan: AIPlan): void {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan))
  } catch {
    /* ignore */
  }
}

export function clearAIPlan(): void {
  try {
    localStorage.removeItem(PLAN_KEY)
  } catch {
    /* ignore */
  }
}

/* --------------------------------- Saved inputs -------------------------------- */

/**
 * Equipment options were reduced from 7 to 3. Map any legacy values that may
 * still live in localStorage onto the new set so old saves don't fail zod.
 */
const LEGACY_EQUIPMENT_MAP: Record<string, string> = {
  bodyweight: "bodyweight",
  "full-gym": "full-gym",
  "cardio-machines": "cardio-machines",
  // Legacy → "full-gym" (a real gym implies access to all of these)
  dumbbells: "full-gym",
  barbell: "full-gym",
  machines: "full-gym",
  kettlebells: "full-gym",
}

function migrateInputs(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw
  const o = raw as Record<string, unknown>
  if (Array.isArray(o.equipment)) {
    const mapped = (o.equipment as unknown[])
      .map((v) => (typeof v === "string" ? LEGACY_EQUIPMENT_MAP[v] ?? null : null))
      .filter((v): v is string => v !== null)
    const unique = Array.from(new Set(mapped))
    o.equipment = unique.length === 0 ? ["bodyweight"] : unique
  }
  // Legacy planLength: was a number (4/6/8/12) or "auto"; now an object.
  if (typeof o.planLength === "number") {
    o.planLength = { unit: "weeks", value: o.planLength }
  } else if (o.planLength === "auto") {
    o.planLength = { unit: "auto", value: 0 }
  }
  return o
}

export function getAIPlanInputs(): AIPlanInputs | null {
  try {
    const raw = localStorage.getItem(INPUTS_KEY)
    if (!raw) return null
    const migrated = migrateInputs(JSON.parse(raw))
    const parsed = aiPlanInputsSchema.safeParse(migrated)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function setAIPlanInputs(inputs: AIPlanInputs): void {
  try {
    localStorage.setItem(INPUTS_KEY, JSON.stringify(inputs))
  } catch {
    /* ignore */
  }
}

export function clearAIPlanInputs(): void {
  try {
    localStorage.removeItem(INPUTS_KEY)
  } catch {
    /* ignore */
  }
}

/* ----------------------------- Active program flag ----------------------------- */

export function getActiveProgram(): ActiveProgram {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    return raw === "ai" ? "ai" : "static"
  } catch {
    return "static"
  }
}

export function setActiveProgram(p: ActiveProgram): void {
  try {
    localStorage.setItem(ACTIVE_KEY, p)
  } catch {
    /* ignore */
  }
}

/* ------------------------------ Reset utilities ------------------------------- */

/** Reset only the AI plan-related state. Returns Program Home to the static plan. */
export function resetAIPlan(): void {
  clearAIPlan()
  clearAIPlanInputs()
  setActiveProgram("static")
}
