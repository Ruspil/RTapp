import { getHrv7dAverage, getTodaysHrv } from "@/lib/helioStrap"

export type FreshnessBand = "green" | "yellow" | "orange" | "red"

export interface FreshnessEntry {
  /** YYYY-MM-DD */
  date: string
  /** RMSSD (ms) measured the same morning via Helio Strap */
  hrv: number
  /** 7-day rolling average used as baseline; may be null if first day */
  hrvAvg7d: number | null
  /** Subjective 0–10 where 10 = great sleep */
  sleep: number
  /** 0–10 where 10 = max stress */
  stress: number
  /** 0–10 where 10 = max fatigue */
  fatigue: number
  /**
   * 0 = mouvement symétrique / RAS, 10 = fort déséquilibre ou inconfort latéral (genou, hanche, cheville…).
   * Optionnel pour rétrocompatibilité — défaut neutre dans les calculs blessure.
   */
  asymmetry?: number
}

export interface FreshnessResult {
  score: number // 0..100
  band: FreshnessBand
  emoji: string
  coefficient: 1 | 0.9 | 0.8 | 0.6
  message: string
  breakdown: {
    hrv: number
    sleep: number
    stress: number
    fatigue: number
  }
}

const LOG_KEY = "trainhard-freshness-log"
const AUTO_ADJUST_KEY = "trainhard-freshness-auto-adjust"

/* ------------------------------ helpers --------------------------------- */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function clamp01To100(n: number): number {
  return Math.min(100, Math.max(0, n))
}

/* ----------------------------- sub-scores ------------------------------- */

export function hrvScore(hrv: number, hrvAvg7d: number | null): number {
  if (!hrvAvg7d || hrvAvg7d <= 0) return 70 // neutral-ish baseline until we have history
  return clamp01To100((hrv / hrvAvg7d) * 100)
}

export function sleepScore(sleep: number): number {
  return clamp01To100((sleep / 10) * 100)
}

export function stressScore(stress: number): number {
  return clamp01To100(((10 - stress) / 10) * 100)
}

export function fatigueScore(fatigue: number): number {
  return clamp01To100(((10 - fatigue) / 10) * 100)
}

/* ----------------------------- aggregate -------------------------------- */

export function computeFreshnessScore(entry: FreshnessEntry): FreshnessResult {
  const hrv = hrvScore(entry.hrv, entry.hrvAvg7d)
  const sleep = sleepScore(entry.sleep)
  const stress = stressScore(entry.stress)
  const fatigue = fatigueScore(entry.fatigue)
  const score = Math.round((hrv + sleep + stress + fatigue) / 4)
  const band = bandForScore(score)
  const coefficient = coefficientForScore(score)
  return {
    score,
    band,
    emoji: emojiForBand(band),
    coefficient,
    message: messageForBand(band),
    breakdown: { hrv, sleep, stress, fatigue },
  }
}

export function bandForScore(score: number): FreshnessBand {
  if (score >= 80) return "green"
  if (score >= 60) return "yellow"
  if (score >= 40) return "orange"
  return "red"
}

export function coefficientForScore(score: number): FreshnessResult["coefficient"] {
  if (score >= 80) return 1
  if (score >= 60) return 0.9
  if (score >= 40) return 0.8
  return 0.6
}

export function emojiForBand(band: FreshnessBand): string {
  switch (band) {
    case "green":
      return "😊"
    case "yellow":
      return "🙂"
    case "orange":
      return "😟"
    case "red":
      return "🤒"
  }
}

export function messageForBand(band: FreshnessBand): string {
  switch (band) {
    case "green":
      return "Pleine fraîcheur — tu peux pousser."
    case "yellow":
      return "Fraîcheur modérée — charges normales, reste à l'écoute."
    case "orange":
      return "Fraîcheur faible — on réduit de 20% pour garder la qualité du mouvement."
    case "red":
      return "Système nerveux très fatigué — priorité mobilité/récup."
  }
}

export function bandColor(band: FreshnessBand): string {
  switch (band) {
    case "green":
      return "#22c55e"
    case "yellow":
      return "#eab308"
    case "orange":
      return "#f97316"
    case "red":
      return "#ef4444"
  }
}

/* ------------------------------ storage --------------------------------- */

export function getFreshnessLog(): FreshnessEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY)
    return raw ? (JSON.parse(raw) as FreshnessEntry[]) : []
  } catch {
    return []
  }
}

export function addFreshnessEntry(entry: FreshnessEntry): void {
  try {
    const prev = getFreshnessLog().filter((e) => e.date !== entry.date)
    const next = [...prev, entry].slice(-60)
    localStorage.setItem(LOG_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/**
 * Returns today's freshness entry — but ONLY if a real HRV measurement from the
 * Helio Strap is present for today. Without real HRV, freshness is inactive.
 */
export function getTodaysFreshness(): {
  entry: FreshnessEntry
  result: FreshnessResult
} | null {
  const hrv = getTodaysHrv()
  if (hrv == null) return null
  const log = getFreshnessLog()
  const today = todayKey()
  const entry = log.find((e) => e.date === today)
  if (!entry) return null
  // Ensure the entry's HRV matches today's measurement (in case the user re-recorded).
  const effective: FreshnessEntry = { ...entry, hrv, hrvAvg7d: getHrv7dAverage() }
  return { entry: effective, result: computeFreshnessScore(effective) }
}

export function getAutoAdjustEnabled(): boolean {
  try {
    const raw = localStorage.getItem(AUTO_ADJUST_KEY)
    return raw == null ? true : raw !== "0"
  } catch {
    return true
  }
}

export function setAutoAdjustEnabled(v: boolean): void {
  try {
    localStorage.setItem(AUTO_ADJUST_KEY, v ? "1" : "0")
  } catch {
    /* ignore */
  }
}

/**
 * Coefficient to apply to the prescribed weight for today's session.
 * Returns 1 when no freshness/HRV available or when the toggle is OFF.
 */
export function getActiveLoadCoefficient(): number {
  if (!getAutoAdjustEnabled()) return 1
  const today = getTodaysFreshness()
  if (!today) return 1
  return today.result.coefficient
}
