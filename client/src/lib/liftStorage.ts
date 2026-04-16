const BASELINES_KEY = "trainhard-lift-baselines-lb"
const SESSION_LOG_KEY = "trainhard-lift-session-log"
const USE_KG_KEY = "trainhard-lift-use-kg"
const SUGGEST_KEY = "trainhard-lift-suggestions"
const BOTH_SIDES_KEY = "trainhard-plank-both-sides"

export type LiftBaselines = Record<string, number>

export interface SetLogEntry {
  exerciseKey: string
  setIndex: number
  lbs: number
  at: string
}

export interface LiftSuggestion {
  key: string
  deltaLb: number
  reason: string
}

export function getLiftBaselines(): LiftBaselines {
  try {
    const raw = localStorage.getItem(BASELINES_KEY)
    return raw ? (JSON.parse(raw) as LiftBaselines) : {}
  } catch {
    return {}
  }
}

export function setLiftBaseline(key: string, lbs: number) {
  const b = getLiftBaselines()
  b[key] = lbs
  localStorage.setItem(BASELINES_KEY, JSON.stringify(b))
}

export function getUseKg(): boolean {
  return localStorage.getItem(USE_KG_KEY) === "1"
}

export function setUseKg(v: boolean) {
  localStorage.setItem(USE_KG_KEY, v ? "1" : "0")
}

export function getBothSidesPlank(): boolean {
  return localStorage.getItem(BOTH_SIDES_KEY) !== "0"
}

export function setBothSidesPlank(v: boolean) {
  localStorage.setItem(BOTH_SIDES_KEY, v ? "1" : "0")
}

export function appendSessionSetLog(entry: SetLogEntry) {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY)
    const arr: SetLogEntry[] = raw ? JSON.parse(raw) : []
    arr.push(entry)
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(arr.slice(-200)))
  } catch {
    /* ignore */
  }
}

export function clearSessionSetLog() {
  try {
    localStorage.removeItem(SESSION_LOG_KEY)
  } catch {
    /* ignore */
  }
}

export function setSuggestion(key: string, deltaLb: number, reason: string) {
  try {
    const s: LiftSuggestion = { key, deltaLb, reason }
    localStorage.setItem(SUGGEST_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function getSuggestion(): LiftSuggestion | null {
  try {
    const raw = localStorage.getItem(SUGGEST_KEY)
    return raw ? (JSON.parse(raw) as LiftSuggestion) : null
  } catch {
    return null
  }
}

export function clearSuggestion() {
  localStorage.removeItem(SUGGEST_KEY)
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462)
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10
}

const CARDIO_HISTORY_KEY = "trainhard-cardio-history"

export interface CardioHistoryEntry {
  exerciseKey: string
  at: string
  pctInTarget: number
  avgBpm: number
}

export function pushCardioHistory(entry: CardioHistoryEntry) {
  try {
    const raw = localStorage.getItem(CARDIO_HISTORY_KEY)
    const arr: CardioHistoryEntry[] = raw ? JSON.parse(raw) : []
    arr.push(entry)
    localStorage.setItem(CARDIO_HISTORY_KEY, JSON.stringify(arr.slice(-80)))
  } catch {
    /* ignore */
  }
}

export function getCardioHistoryForExercise(exerciseKey: string, limit = 5): CardioHistoryEntry[] {
  try {
    const raw = localStorage.getItem(CARDIO_HISTORY_KEY)
    const arr: CardioHistoryEntry[] = raw ? JSON.parse(raw) : []
    return arr.filter((e) => e.exerciseKey === exerciseKey).slice(-limit)
  } catch {
    return []
  }
}
