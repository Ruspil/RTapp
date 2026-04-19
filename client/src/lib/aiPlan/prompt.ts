import { planLengthLabel, planLengthToWeeks, type AIPlanInputs } from "./schema"

/**
 * The model must output VALID JSON only — no markdown, no commentary, no
 * code fences. The shape is documented in the system prompt as a tight
 * specification so the response stays small enough for the 512-token cap.
 */
export const AI_PLAN_SYSTEM_PROMPT = `Tu es un coach S&C certifié. Tu construis des plans réalistes et sûrs. Tu réponds UNIQUEMENT en JSON valide (RFC 8259), sans markdown, sans commentaire, sans texte avant/après.

Règles strictes:
- durationMin de chaque session DOIT être entre sessionMinMin et sessionMaxMin (couloir de 10 min sous le max).
- Volume: ~1 exercice par 6-8 minutes. 60 min = 8-10 exos, 80 min = 10-12, 90 min = 12-14. Inclure échauffement + bloc principal + accessoires + finisher. JAMAIS moins de 4 exercices pour une séance de 45+ min.
- Chaque exercice DOIT avoir un champ "load" NON VIDE. Exemples: "60kg" (charge absolue), "70% 1RM", "BW" (poids du corps), "RPE 8", "Z2 (~70% FCmax)".
- Inclure une semaine de "deload" (volume -50%) si totalWeeks >= 6.
- Respecte équipement disponible, blessures (évite zones touchées, mentionne via notes), jours/semaine, durée par séance.
- Si "auto": jours 3-5, longueur 6-8 sem.
- Cite [Sn] dans le tableau "citations" si du contexte scientifique est fourni.

Schéma de sortie (JSON strict):
{
  "totalWeeks": number,
  "daysPerWeek": number,
  "weeks": [
    {
      "week": number,
      "theme": string,
      "deload": boolean,
      "days": [
        {
          "day": number,
          "label": string,
          "sessions": [
            {
              "id": string,
              "type": "workout" | "primer" | "cardio" | "recovery",
              "name": string,
              "focus": string,
              "durationMin": number,
              "exercises": [
                { "name": string, "sets": number, "reps": string, "load": string, "rpe": number, "rest": string, "notes": string }
              ],
              "notes": string
            }
          ]
        }
      ]
    }
  ],
  "coachingSummary": string,
  "citations": [string]
}`

function fmtList(items: readonly string[]): string {
  return items.length === 0 ? "(aucun)" : items.join(", ")
}

/** Window of acceptable durationMin values per session (max - 10 .. max). */
function sessionDurationWindow(maxMin: number): { min: number; target: number; max: number } {
  const max = Math.max(15, Math.min(180, maxMin))
  const min = Math.max(10, max - 10)
  const target = Math.round((min + max) / 2)
  return { min, target, max }
}

/**
 * Builds a compact user message with the questionnaire answers serialized as JSON.
 * Adds a tiny natural-language preamble so the model has clear instructions.
 *
 * `ragContext` (optional) is a labeled block of retrieved scientific snippets
 * with [S1], [S2]... markers. Injected verbatim — the model is asked to cite
 * those markers in `citations` when relevant.
 */
export function buildPlanUserMessage(inputs: AIPlanInputs, ragContext = ""): string {
  const profile = {
    sex: inputs.sex,
    age: inputs.age,
    height: `${inputs.heightValue}${inputs.heightUnit}`,
    weight: `${inputs.weightValue}${inputs.weightUnit}`,
    experience: inputs.experience,
    sport: inputs.sport === "other" ? inputs.sportFreeText ?? "other" : inputs.sport,
    footballPosition: inputs.footballPosition ?? null,
    dominantFoot: inputs.dominantFoot ?? null,
  }

  const goals = {
    primary: inputs.primaryGoal,
    secondary: inputs.secondaryGoals,
  }

  const window = sessionDurationWindow(inputs.sessionLengthMin)
  const constraints = {
    equipment: fmtList(inputs.equipment),
    injuriesNotes: inputs.injuries ?? "(aucune)",
    sessionMinMin: window.min,
    sessionTargetMin: window.target,
    sessionMaxMin: window.max,
  }

  const planWeeks = planLengthToWeeks(inputs.planLength)
  const schedule = {
    daysPerWeek: inputs.daysPerWeek,
    preferredRestDays: inputs.preferredRestDays,
    planLength: planLengthLabel(inputs.planLength),
    planLengthInWeeks: planWeeks ?? "auto",
  }

  const freshness = inputs.freshnessHint
    ? `Indices fraîcheur récents (Helio Strap): HRV jour ${inputs.freshnessHint.hrvToday ?? "?"}ms, moyenne 7j ${inputs.freshnessHint.hrv7dAvg ?? "?"}ms — module l'intensité initiale en conséquence.`
    : ""

  const targetExercises = Math.max(3, Math.round(constraints.sessionTargetMin / 7))

  return [
    "Plan personnalisé en JSON STRICT (voir schéma système).",
    ragContext,
    "Profil: " + JSON.stringify(profile),
    "Objectifs: " + JSON.stringify(goals),
    "Contraintes: " + JSON.stringify(constraints),
    "Calendrier: " + JSON.stringify(schedule),
    freshness,
    `Cibles: durée ${constraints.sessionMinMin}-${constraints.sessionMaxMin} min, ~${targetExercises} exos/séance (min ${Math.max(4, targetExercises - 2)}), totalWeeks=${planWeeks ?? "auto"}.`,
  ]
    .filter(Boolean)
    .join("\n")
}

/* ============================================================
 * Two-pass fallback: skeleton then per-week.
 * Used when a single full-plan response would exceed the token budget.
 * ============================================================ */

export interface PlanSkeleton {
  totalWeeks: number
  daysPerWeek: number
  coachingSummary: string
  weekThemes: Array<{ theme: string; deload?: boolean }>
  citations?: string[]
}

/**
 * First pass: ask only for the high-level skeleton (totalWeeks, daysPerWeek,
 * coaching summary, and one short theme per week). Cheap and reliably fits.
 */
export function buildSkeletonUserMessage(inputs: AIPlanInputs, ragContext = ""): string {
  const planWeeks = planLengthToWeeks(inputs.planLength)
  const sport = inputs.sport === "other" ? inputs.sportFreeText ?? "other" : inputs.sport
  return [
    `Squelette JSON (pas d'exercices): {"totalWeeks":number,"daysPerWeek":number,"coachingSummary":string,"weekThemes":[{"theme":string,"deload":boolean?}],"citations":string[]?}.`,
    `weekThemes doit avoir EXACTEMENT totalWeeks éléments.`,
    ragContext,
    `Profil: ${sport}${inputs.footballPosition ? `/${inputs.footballPosition}` : ""}, ${inputs.experience}, goal=${inputs.primaryGoal}, équipement=${inputs.equipment.join(",")}, daysPerWeek=${inputs.daysPerWeek}, totalWeeks=${planWeeks ?? "auto"}.`,
  ].filter(Boolean).join("\n")
}

/**
 * Second pass: generate one specific week (with full exercise detail).
 * Slim version — assumes the system prompt already covers profile/objectives;
 * only re-injects per-call specifics (theme, equipment, injuries, duration window).
 */
export function buildSingleWeekUserMessage(
  inputs: AIPlanInputs,
  ctx: {
    weekNumber: number
    totalWeeks: number
    daysPerWeek: number
    theme: string
    deload?: boolean
  },
  ragContext = "",
): string {
  const w = sessionDurationWindow(inputs.sessionLengthMin)
  const target = Math.max(3, Math.round(w.target / 7))
  const sport = inputs.sport === "other" ? inputs.sportFreeText ?? "other" : inputs.sport
  return [
    `Renvoie UNIQUEMENT la semaine ${ctx.weekNumber}/${ctx.totalWeeks} en JSON strict.`,
    `Schéma:`,
    `{"week": ${ctx.weekNumber}, "theme": string, "deload": boolean, "days": [ { "day": 1..7, "label": string, "sessions": [ { "id": string, "type": "workout"|"primer"|"cardio"|"recovery", "name": string, "focus": string, "durationMin": number, "exercises": [ { "name": string, "sets": number, "reps": string, "load": string, "rpe": number, "rest": string, "notes": string } ], "notes": string } ] } ]}`,
    ragContext,
    `Theme imposé: "${ctx.theme}"${ctx.deload ? " (DELOAD: -40 à -50% volume)" : ""}. daysPerWeek=${ctx.daysPerWeek} (donc ${ctx.daysPerWeek} jours dans "days").`,
    `Sport: ${sport}${inputs.footballPosition ? ` (${inputs.footballPosition})` : ""}. Niveau: ${inputs.experience}. Goal: ${inputs.primaryGoal}.`,
    `Équipement: ${inputs.equipment.join(", ")}. Blessures: ${inputs.injuries ?? "aucune"}.`,
    `Durée par séance: ${w.min}-${w.max} min. Volume: ~${target} exercices par séance (jamais moins de ${Math.max(4, target - 2)}). Chaque exercice DOIT avoir "load" non vide.`,
  ].filter(Boolean).join("\n")
}
