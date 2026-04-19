import type { CompletedSession } from "@/lib/workoutData"
import type { FreshnessEntry } from "@/lib/freshness"

/**
 * ============================================================
 * Évaluation proactive du risque de blessure (version locale)
 * ============================================================
 * Combine :
 * - Charge d'entraînement (ratio type aigu / chronique sur l’historique complété)
 * - Sommeil et fatigue (formulaire matinal)
 * - Asymétrie / déséquilibre gauche-droite (auto-déclaré)
 *
 * Limites : pas de capteurs de mouvement réels ; l’asymétrie repose sur le ressenti.
 * Les sorties sont des aides à la décision, pas un diagnostic médical.
 */

export type InjuryRiskLevel = "low" | "moderate" | "high" | "critical"

export interface InjuryRiskFactors {
  /** 0–100 : contrainte liée au ratio de charge (ACWR simplifié) */
  loadStrain: number
  /** 0–100 : manque de sommeil */
  sleepStrain: number
  /** 0–100 : asymétrie / inconfort latéral */
  asymmetryStrain: number
  /** 0–100 : fatigue accumulée ressentie */
  fatigueStrain: number
  /** Ratio charge aiguë 7j / charge chronique (~moyenne hebdo sur 28j). null si pas assez d’historique */
  acuteChronicRatio: number | null
}

export interface InjuryRiskAssessment {
  /** 0 = risque faible, 100 = risque très élevé */
  riskScore: number
  level: InjuryRiskLevel
  factors: InjuryRiskFactors
  /** true si sommeil / asymétrie / fatigue viennent des défauts (pas d’entrée aujourd’hui) */
  usesDefaultSubjective: boolean
  title: string
  summary: string
  /** Conseils concrets priorité récup */
  recommendations: string[]
}

const MS_DAY = 86_400_000

function startOfUtcDay(ts: number): number {
  const d = new Date(ts)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** Charge interne proxy : durée × % complétion (minutes équivalentes). */
function sessionLoadUnits(s: CompletedSession): number {
  return (s.durationSeconds / 60) * (s.percentComplete / 100)
}

/**
 * Somme les charges par jour [0 = aujourd’hui UTC] sur `daysBack` jours.
 */
function dailyLoadSeries(completed: CompletedSession[], daysBack: number): Map<number, number> {
  const byDay = new Map<number, number>()
  const now = Date.now()
  const todayStart = startOfUtcDay(now)

  for (let i = 0; i < daysBack; i++) {
    byDay.set(todayStart - i * MS_DAY, 0)
  }

  for (const s of completed) {
    const t = new Date(s.completedAt).getTime()
    const dayStart = startOfUtcDay(t)
    if (!byDay.has(dayStart)) continue
    byDay.set(dayStart, (byDay.get(dayStart) ?? 0) + sessionLoadUnits(s))
  }
  return byDay
}

/**
 * ACWR simplifié : charge 7 derniers jours / (charge 28j / 4).
 * Valeurs typiques saines ~ 0.8–1.3. > 1.5 = pic de charge (risque blessure overload).
 */
function computeAcuteChronicRatio(completed: CompletedSession[]): {
  ratio: number | null
  acute7: number
  chronic28: number
  sessionsIn28: number
} {
  const byDay = dailyLoadSeries(completed, 32)
  const keys = [...byDay.keys()].sort((a, b) => b - a)
  let acute7 = 0
  for (let i = 0; i < 7; i++) {
    acute7 += byDay.get(keys[i]) ?? 0
  }
  let chronic28 = 0
  for (let i = 0; i < 28; i++) {
    chronic28 += byDay.get(keys[i]) ?? 0
  }
  const chronicWeekly = chronic28 / 4
  const sessionsIn28 = completed.filter((s) => {
    const t = new Date(s.completedAt).getTime()
    return Date.now() - t <= 28 * MS_DAY
  }).length

  if (sessionsIn28 < 2 && acute7 < 1) {
    return { ratio: null, acute7, chronic28, sessionsIn28 }
  }
  const ratio = chronicWeekly > 0.01 ? acute7 / chronicWeekly : acute7 > 5 ? 2 : null
  return { ratio, acute7, chronic28, sessionsIn28 }
}

/** Mappe un ratio ACWR vers une contrainte 0–100 (100 = très risqué). */
function loadStrainFromRatio(ratio: number | null): number {
  if (ratio == null) return 28
  if (ratio < 0.85) return 12
  if (ratio < 1.0) return 22
  if (ratio < 1.15) return 38
  if (ratio < 1.3) return 58
  if (ratio < 1.45) return 76
  return 92
}

function sleepStrain(sleep0to10: number): number {
  return Math.min(100, Math.max(0, (1 - sleep0to10 / 10) * 100))
}

function asymmetryStrain(asym0to10: number): number {
  return Math.min(100, Math.max(0, (asym0to10 / 10) * 100))
}

function fatigueStrain(fatigue0to10: number): number {
  return Math.min(100, Math.max(0, (fatigue0to10 / 10) * 100))
}

function levelForScore(score: number): InjuryRiskLevel {
  if (score < 32) return "low"
  if (score < 52) return "moderate"
  if (score < 72) return "high"
  return "critical"
}

function defaultSubjective(): Pick<FreshnessEntry, "sleep" | "fatigue" | "asymmetry"> {
  return { sleep: 7, fatigue: 4, asymmetry: 4 }
}

export interface AssessInjuryRiskInput {
  completedSessions: CompletedSession[]
  /** Entrée fraîcheur du jour si disponible (sinon défauts neutres + flag) */
  todaysSubjective: FreshnessEntry | null
}

/**
 * Calcule le score global de risque et des recommandations.
 * Pondérations : charge 38 %, sommeil 22 %, asymétrie 22 %, fatigue 18 %.
 */
export function assessInjuryRisk(input: AssessInjuryRiskInput): InjuryRiskAssessment {
  const { ratio } = computeAcuteChronicRatio(input.completedSessions)
  const loadStrain = loadStrainFromRatio(ratio)

  const sub = input.todaysSubjective
  const usesDefaultSubjective = !sub
  const s = sub
    ? {
        sleep: sub.sleep,
        fatigue: sub.fatigue,
        asymmetry: sub.asymmetry ?? 4,
      }
    : defaultSubjective()

  const sleepS = sleepStrain(s.sleep ?? 7)
  const asymS = asymmetryStrain(s.asymmetry ?? 4)
  const fatS = fatigueStrain(s.fatigue ?? 4)

  const riskScore = Math.round(
    loadStrain * 0.38 + sleepS * 0.22 + asymS * 0.22 + fatS * 0.18,
  )

  const level = levelForScore(riskScore)

  const recommendations: string[] = []
  if (loadStrain >= 55) {
    recommendations.push(
      "Réduis le volume ou l’intensité cette semaine : ta charge récente dépasse ta baseline habituelle.",
    )
  }
  if (sleepS >= 45) {
    recommendations.push(
      "Priorise 7–9 h de sommeil et une routine fixe ; la récupération nerveuse baisse le risque tendineux.",
    )
  }
  if (asymS >= 45) {
    recommendations.push(
      "Intègre du travail unilatéral léger et symétrique (mobilité hanche/cheville) avant les séances explosives.",
    )
  }
  if (fatS >= 55) {
    recommendations.push(
      "Ajoute une séance de récup active ou du volume en zone facile à la place d’une sortie intense.",
    )
  }
  if (recommendations.length === 0) {
    recommendations.push("Maintiens la variabilité : alterne charges lourdes et jours légers pour rester résilient.")
  }

  let title = "Risque blessure : faible"
  let summary =
    "Tes signaux charge / sommeil / asymétrie sont cohérents avec une période raisonnable. Reste attentif aux douleurs localisées."
  if (level === "moderate") {
    title = "Risque blessure : modéré"
    summary =
      "Quelques signaux (charge, sommeil ou ressenti) méritent attention — ajuste légèrement la semaine."
  } else if (level === "high") {
    title = "Risque blessure : élevé"
    summary =
      "Priorise la récupération : risque de surcharge ou de compensation asymétrique élevé par rapport à tes habitudes."
  } else if (level === "critical") {
    title = "Risque blessure : critique"
    summary =
      "Envisage de décharger fortement 48–72 h et de consulter si douleur persistante ou gonflement — le modèle détecte un déséquilibre marqué."
  }

  if (usesDefaultSubjective) {
    summary +=
      " (Estimation partielle : complète le formulaire matinal avec HRV pour affiner sommeil, fatigue et asymétrie.)"
  }

  return {
    riskScore,
    level,
    factors: {
      loadStrain,
      sleepStrain: sleepS,
      asymmetryStrain: asymS,
      fatigueStrain: fatS,
      acuteChronicRatio: ratio,
    },
    usesDefaultSubjective,
    title,
    summary,
    recommendations: recommendations.slice(0, 4),
  }
}

/** Couleur d’UI selon le niveau */
export function injuryRiskLevelColor(level: InjuryRiskLevel): string {
  switch (level) {
    case "low":
      return "#22c55e"
    case "moderate":
      return "#eab308"
    case "high":
      return "#f97316"
    case "critical":
      return "#ef4444"
  }
}
