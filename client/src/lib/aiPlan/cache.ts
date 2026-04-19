import { aiPlanSchema, type AIPlan, type AIPlanInputs } from "./schema"

const CACHE_KEY = "trainhard-ai-plan-cache"
const MAX_ENTRIES = 5

interface CacheEntry {
  hash: string
  plan: AIPlan
  createdAt: string
}

interface CacheFile {
  entries: CacheEntry[]
}

/**
 * Stable JSON: sort object keys recursively so two semantically identical
 * inputs produce the exact same string before hashing.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(o).sort()) {
      out[k] = canonicalize(o[k])
    }
    return out
  }
  return value
}

/**
 * Builds a deterministic hash for the user inputs. Excludes `freshnessHint`
 * because HRV changes daily and would defeat caching.
 */
export async function hashInputs(inputs: AIPlanInputs): Promise<string> {
  const { freshnessHint: _ignored, ...rest } = inputs
  void _ignored
  const json = JSON.stringify(canonicalize(rest))
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  // Fallback: simple FNV-ish hash (browsers without subtle crypto are rare).
  let h = 2166136261
  for (let i = 0; i < json.length; i++) h = (h ^ json.charCodeAt(i)) * 16777619
  return (h >>> 0).toString(16)
}

function loadCache(): CacheFile {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { entries: [] }
    const parsed = JSON.parse(raw) as CacheFile
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [] }
    // Validate plans against current schema (drops stale shapes).
    parsed.entries = parsed.entries.filter((e) => aiPlanSchema.safeParse(e.plan).success)
    return parsed
  } catch {
    return { entries: [] }
  }
}

function saveCache(file: CacheFile): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(file))
  } catch {
    /* ignore quota errors */
  }
}

export function getCachedPlan(hash: string): AIPlan | null {
  const file = loadCache()
  const hit = file.entries.find((e) => e.hash === hash)
  return hit ? hit.plan : null
}

export function setCachedPlan(hash: string, plan: AIPlan): void {
  const file = loadCache()
  // Drop existing entry with same hash, then push new one to head (LRU).
  file.entries = file.entries.filter((e) => e.hash !== hash)
  file.entries.unshift({ hash, plan, createdAt: new Date().toISOString() })
  if (file.entries.length > MAX_ENTRIES) file.entries.length = MAX_ENTRIES
  saveCache(file)
}

export function clearAIPlanCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}
