import { apiBase, authHeader } from "@/lib/api"
import {
  aiPlanFromModelSchema,
  aiPlanSchema,
  aiPlanWeekSchema,
  planLengthToWeeks,
  type AIPlan,
  type AIPlanInputs,
  type AIPlanWeek,
} from "./schema"
import {
  AI_PLAN_SYSTEM_PROMPT,
  buildPlanUserMessage,
  buildSingleWeekUserMessage,
  buildSkeletonUserMessage,
  type PlanSkeleton,
} from "./prompt"
import { retrieveContext } from "./rag"
import { extrapolateWeek } from "./extrapolate"
import { getCachedPlan, hashInputs, setCachedPlan } from "./cache"

interface ChatRequestBody {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  context?: string
  /** Override server's default 512-token cap. Server clamps 64..8000. */
  maxTokens?: number
  temperature?: number
  /** Ask Groq for response_format: json_object. */
  jsonMode?: boolean
}

interface ChatResponse {
  content?: string
  error?: string
}

/* ============================================================
 * Token-per-minute throttle (Groq free tier = 12 000 TPM).
 * Tracks rolling 60s usage; gates new calls until budget allows.
 * ============================================================ */

const TPM_WINDOW_MS = 60_000
const TPM_BUDGET = 10_000 // 12k cap minus headroom for response tokens
const used: Array<{ ts: number; tokens: number }> = []

function estimateTokens(s: string): number {
  // Rough: 1 token ≈ 4 chars. Conservative upper bound.
  return Math.ceil(s.length / 4)
}

function currentlyUsed(): number {
  const cutoff = Date.now() - TPM_WINDOW_MS
  while (used.length && used[0].ts < cutoff) used.shift()
  return used.reduce((s, e) => s + e.tokens, 0)
}

async function gateForBudget(estTokens: number, onWait?: (ms: number) => void): Promise<void> {
  while (true) {
    const sum = currentlyUsed()
    if (sum + estTokens <= TPM_BUDGET) return
    const oldest = used[0]?.ts ?? Date.now()
    const wait = Math.max(500, TPM_WINDOW_MS - (Date.now() - oldest) + 200)
    onWait?.(wait)
    await new Promise((r) => setTimeout(r, wait))
  }
}

function recordUsage(tokens: number) {
  used.push({ ts: Date.now(), tokens })
}

/** Parse "Please try again in 2.475s" out of Groq's 429 message. Returns ms. */
function parseRetryAfterMs(msg: string): number | null {
  const m = msg.match(/try again in\s+([\d.]+)\s*s/i)
  if (!m) return null
  const sec = parseFloat(m[1])
  if (Number.isNaN(sec)) return null
  return Math.ceil(sec * 1000) + 250
}

interface CallOptions {
  /** Called when the throttle is sleeping (ms wait); use for UX feedback. */
  onRateLimit?: (waitMs: number, reason: "tpm" | "429") => void
}

async function callChat(body: ChatRequestBody, opts: CallOptions = {}): Promise<string> {
  const promptTokens = estimateTokens(JSON.stringify(body.messages))
  const responseBudget = body.maxTokens ?? 512
  const estTotal = promptTokens + responseBudget

  await gateForBudget(estTotal, (ms) => opts.onRateLimit?.(ms, "tpm"))

  const doFetch = async () => {
    const res = await fetch(`${apiBase()}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as ChatResponse
    if (!res.ok) {
      const err = data.error ?? `Erreur ${res.status}`
      throw Object.assign(new Error(err), { status: res.status, raw: err })
    }
    return data.content ?? ""
  }

  recordUsage(estTotal)

  try {
    return await doFetch()
  } catch (e) {
    const errAny = e as { status?: number; message?: string }
    const msg = errAny.message ?? ""
    // Retry once on 429 / explicit rate-limit text after waiting the suggested time.
    if (errAny.status === 429 || /rate limit/i.test(msg) || /try again in/i.test(msg)) {
      const wait = parseRetryAfterMs(msg) ?? 5000
      opts.onRateLimit?.(wait, "429")
      await new Promise((r) => setTimeout(r, wait))
      recordUsage(estTotal)
      return await doFetch()
    }
    throw e
  }
}

/**
 * Tries to extract a JSON object from a model response that may include stray
 * markdown fences, prose, smart quotes, trailing commas, or even a truncated
 * tail (a common failure mode when the model hits the max-token cap mid-array).
 *
 * Strategy:
 *  1. Strip markdown fences and trim.
 *  2. Try a direct parse.
 *  3. Slice between first "{" and last "}" and try again.
 *  4. Sanitize: replace smart quotes, drop trailing commas, then retry.
 *  5. As a last resort, walk back from the last "}" and try to close any
 *     unbalanced brackets so a truncated response still yields a valid object.
 */
function extractJsonObject(text: string): unknown | null {
  if (!text) return null
  let s = text.trim()
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")
  const tryParse = (str: string): unknown | null => {
    try {
      return JSON.parse(str)
    } catch {
      return null
    }
  }

  let parsed = tryParse(s)
  if (parsed && typeof parsed === "object") return parsed

  const start = s.indexOf("{")
  const end = s.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  const slice = s.slice(start, end + 1)

  parsed = tryParse(slice)
  if (parsed && typeof parsed === "object") return parsed

  // Sanitize: smart quotes → straight, drop trailing commas before } or ].
  const sanitized = slice
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,(\s*[}\]])/g, "$1")

  parsed = tryParse(sanitized)
  if (parsed && typeof parsed === "object") return parsed

  // Last resort: try to repair a truncated tail by closing open brackets.
  const repaired = repairTruncatedJson(sanitized)
  if (repaired) {
    parsed = tryParse(repaired)
    if (parsed && typeof parsed === "object") return parsed
  }

  return null
}

/**
 * Best-effort recovery for JSON cut off mid-string/array/object (which happens
 * when the LLM hits the max-token cap). Walks the text once, tracks bracket
 * depth + string state, then appends the missing closing brackets/quotes.
 *
 * Returns null if the input doesn't look recoverable.
 */
function repairTruncatedJson(s: string): string | null {
  const stack: Array<"{" | "["> = []
  let inString = false
  let escape = false
  let lastSafeEnd = -1 // last index we know ends a valid value (', ', '}', ']')

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === "\\" && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      if (!inString) lastSafeEnd = i
      continue
    }
    if (inString) continue
    if (ch === "{" || ch === "[") stack.push(ch as "{" | "[")
    else if (ch === "}" || ch === "]") {
      stack.pop()
      lastSafeEnd = i
    } else if (ch === "," || /\s/.test(ch)) {
      // not significant
    } else if (/[\d.\-+eE]/.test(ch)) {
      lastSafeEnd = i
    }
  }

  // If the JSON was already balanced and not in a string, nothing to repair.
  if (!inString && stack.length === 0) return null

  // Trim to the last safe end so we don't keep half-written tokens.
  let head = lastSafeEnd >= 0 ? s.slice(0, lastSafeEnd + 1) : s
  // Drop a dangling trailing comma if any.
  head = head.replace(/,\s*$/, "")

  let suffix = ""
  if (inString) suffix += '"'
  while (stack.length > 0) {
    const open = stack.pop()
    suffix += open === "{" ? "}" : "]"
  }
  return head + suffix
}

function makePlanId(): string {
  return `aiplan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const SKELETON_TOKENS = 1200
const SINGLE_WEEK_TOKENS = 1800
const FULL_PLAN_TOKENS = 6000

/** Plans up to this many weeks go through the cheap one-shot path. */
const ONE_SHOT_MAX_WEEKS = 4

export type GenerationPhase =
  | "cache"
  | "rag"
  | "plan"
  | "skeleton"
  | "week"
  | "extrapolate"
  | "rate-limited"

export interface GenerateProgress {
  phase: GenerationPhase
  current?: number
  total?: number
  /** When phase === "rate-limited", how many ms we're waiting. */
  waitMs?: number
}

export interface GenerateOptions {
  onProgress?: (p: GenerateProgress) => void
  /** When true, skip the localStorage cache check (force a fresh API call). */
  bypassCache?: boolean
}

/** Total tokens consumed by the rolling 60s window — used by the UI counter. */
export function getRecentTokensUsed(): number {
  return currentlyUsed()
}

/**
 * Generates a personalized AI plan with several token-saving strategies:
 *
 *  1. Cache: hash of inputs → reuse if seen (LRU 5).
 *  2. RAG context (topK 3, NVIDIA NIM).
 *  3. Plans <= 4 weeks: one-shot full plan (cheapest path that works).
 *  4. Plans >= 5 weeks: skeleton + 1-2 detailed weeks (normal + deload),
 *     remaining weeks are extrapolated locally with progression rules.
 *  5. On failure: fall back to per-week generation.
 */
export async function generatePlan(
  inputs: AIPlanInputs,
  options: GenerateOptions = {},
): Promise<AIPlan> {
  const { onProgress, bypassCache } = options

  // ---------- Step 0: Cache lookup ----------
  const inputsHash = await hashInputs(inputs)
  if (!bypassCache) {
    const cached = getCachedPlan(inputsHash)
    if (cached) {
      onProgress?.({ phase: "cache" })
      // Refresh id + createdAt so saved plan looks fresh in storage but reuse content.
      return { ...cached, id: makePlanId(), createdAt: new Date().toISOString(), inputs }
    }
  }

  // ---------- Step 1: RAG retrieval (best-effort) ----------
  onProgress?.({ phase: "rag" })
  const ragContext = await retrieveContext(inputs).catch(() => "")

  const callOpts: CallOptions = {
    onRateLimit: (waitMs) => onProgress?.({ phase: "rate-limited", waitMs }),
  }

  const planWeeksRequested = planLengthToWeeks(inputs.planLength) ?? 8
  const useTemplate = planWeeksRequested >= 5

  // ---------- Pass 1: small plans → one-shot ----------
  if (!useTemplate) {
    onProgress?.({ phase: "plan" })
    try {
      const raw = await callChat(
        {
          messages: [
            { role: "system", content: AI_PLAN_SYSTEM_PROMPT },
            { role: "user", content: buildPlanUserMessage(inputs, ragContext) },
          ],
          maxTokens: FULL_PLAN_TOKENS,
          jsonMode: true,
        },
        callOpts,
      )
      const parsed = aiPlanFromModelSchema.safeParse(extractJsonObject(raw))
      if (parsed.success) {
        const plan = finalizePlan(inputs, parsed.data)
        setCachedPlan(inputsHash, plan)
        return plan
      }
    } catch {
      /* fall through to template */
    }
  }

  // ---------- Pass 2: template strategy (skeleton + 1-2 detailed + extrapolation) ----------
  return generatePlanFromTemplate(inputs, ragContext, options, callOpts, inputsHash)
}

async function generatePlanFromTemplate(
  inputs: AIPlanInputs,
  ragContext: string,
  options: GenerateOptions,
  callOpts: CallOptions,
  inputsHash: string,
): Promise<AIPlan> {
  // Step A: skeleton (themes + totalWeeks/daysPerWeek + coachingSummary).
  options.onProgress?.({ phase: "skeleton" })

  let skel: PlanSkeleton | null = null
  for (let attempt = 0; attempt < 2 && !skel; attempt++) {
    const skeletonRaw = await callChat(
      {
        messages: [
          { role: "system", content: AI_PLAN_SYSTEM_PROMPT },
          { role: "user", content: buildSkeletonUserMessage(inputs, ragContext) },
        ],
        maxTokens: SKELETON_TOKENS,
        jsonMode: true,
      },
      callOpts,
    )
    skel = parseSkeleton(extractJsonObject(skeletonRaw))
  }
  if (!skel) {
    throw new Error(
      "Le modèle n'a pas renvoyé un squelette de plan valide. Réessaie dans une minute ou raccourcis le plan.",
    )
  }

  // Step B: generate week 1 in detail. Week 1 is the spine of the whole plan
  // (every other week is extrapolated from it), so we retry once on failure
  // before giving up — much friendlier than killing the entire generation
  // because of a single rate-limit blip or malformed JSON chunk.
  const week1Theme = skel.weekThemes[0]
  options.onProgress?.({ phase: "week", current: 1, total: skel.totalWeeks })
  let week1: AIPlanWeek | null = null
  let lastWeek1Err: unknown = null
  for (let attempt = 0; attempt < 2 && !week1; attempt++) {
    try {
      week1 = await generateOneWeek(
        inputs,
        ragContext,
        callOpts,
        1,
        skel.totalWeeks,
        skel.daysPerWeek,
        week1Theme.theme,
        week1Theme.deload,
      )
    } catch (e) {
      lastWeek1Err = e
    }
  }
  if (!week1) {
    throw new Error(
      `Impossible de générer la semaine 1 (${
        lastWeek1Err instanceof Error ? lastWeek1Err.message : "réponse invalide"
      }). Réessaie ou raccourcis le plan.`,
    )
  }

  // Step C: optionally generate the first deload week in detail (cheaper than
  // extrapolating the deload, which has different volume/intensity rules).
  // CRUCIALLY: this step is a nice-to-have. If it fails (rate limit, malformed
  // JSON, network blip) we MUST NOT throw — the rest of the plan can still be
  // built by extrapolating from week 1. Failing here was the main reason the
  // generation appeared to "fail at the very end".
  const deloadIdx = skel.weekThemes.findIndex((t, i) => i > 0 && t.deload)
  let detailedDeload: AIPlanWeek | null = null
  if (deloadIdx > 0) {
    const wNo = deloadIdx + 1
    options.onProgress?.({ phase: "week", current: 2, total: 2 })
    try {
      detailedDeload = await generateOneWeek(
        inputs,
        ragContext,
        callOpts,
        wNo,
        skel.totalWeeks,
        skel.daysPerWeek,
        skel.weekThemes[deloadIdx].theme,
        true,
      )
    } catch (e) {
      console.warn(
        `[aiPlan] Deload week ${wNo} generation failed, will extrapolate instead.`,
        e,
      )
      detailedDeload = null
    }
  }

  // Step D: extrapolate remaining weeks locally (zero tokens).
  options.onProgress?.({ phase: "extrapolate" })
  const weeks: AIPlanWeek[] = []
  for (let i = 0; i < skel.weekThemes.length; i++) {
    const wNo = i + 1
    if (wNo === 1) {
      weeks.push(week1)
    } else if (detailedDeload && wNo === deloadIdx + 1) {
      weeks.push(detailedDeload)
    } else {
      const theme = skel.weekThemes[i]
      // Use the closest detailed week as base. For deload weeks without a
      // detailed counterpart, also extrapolate from week 1 with deload rules.
      weeks.push(extrapolateWeek(week1, wNo, skel.totalWeeks, !!theme.deload, theme.theme))
    }
  }

  const plan = finalizePlan(inputs, {
    totalWeeks: skel.totalWeeks,
    daysPerWeek: skel.daysPerWeek,
    weeks,
    coachingSummary: skel.coachingSummary,
    citations: skel.citations,
  })
  setCachedPlan(inputsHash, plan)
  return plan
}

async function generateOneWeek(
  inputs: AIPlanInputs,
  ragContext: string,
  callOpts: CallOptions,
  weekNumber: number,
  totalWeeks: number,
  daysPerWeek: number,
  theme: string,
  deload: boolean | undefined,
): Promise<AIPlanWeek> {
  const raw = await callChat(
    {
      messages: [
        { role: "system", content: AI_PLAN_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildSingleWeekUserMessage(
            inputs,
            { weekNumber, totalWeeks, daysPerWeek, theme, deload },
            ragContext,
          ),
        },
      ],
      maxTokens: SINGLE_WEEK_TOKENS,
      jsonMode: true,
    },
    callOpts,
  )
  // Models drift on field discipline (e.g. they echo "week": 1 even when we
  // asked for week N, or set day numbers like 0 or 8 that violate the schema).
  // We coerce these AFTER extraction but BEFORE validation so a single drifted
  // field doesn't make us throw away an otherwise-valid week.
  const normalized = normalizeWeekJson(extractJsonObject(raw), weekNumber, theme, deload)
  const parsed = aiPlanWeekSchema.safeParse(normalized)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue ? `${issue.path.join(".") || "(root)"}: ${issue.message}` : "structure invalide"
    throw new Error(`Semaine ${weekNumber} invalide (${where}). Réessaie ou raccourcis le plan.`)
  }
  return parsed.data
}

/**
 * Tolerate small model deviations on a per-week response:
 *  - force `week` to the requested number (model often echoes 1).
 *  - clamp `day` numbers into 1..7 and de-duplicate by reassigning sequentially
 *    if needed (common drift is `day: 0` or repeated `day: 1`).
 *  - drop `deload: false` to undefined and prefer the requested theme if blank.
 *  - drop sessions/days that are clearly empty (no exercises).
 */
function normalizeWeekJson(
  raw: unknown,
  weekNumber: number,
  fallbackTheme: string,
  deload: boolean | undefined,
): unknown {
  if (!raw || typeof raw !== "object") return raw
  const obj = raw as Record<string, unknown>
  obj.week = weekNumber
  if (typeof obj.theme !== "string" || obj.theme.trim() === "") obj.theme = fallbackTheme
  if (deload === true) obj.deload = true
  else if (obj.deload === false) delete obj.deload

  if (Array.isArray(obj.days)) {
    const days = (obj.days as unknown[])
      .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
      .map((d) => {
        const dayObj = d as Record<string, unknown>
        if (Array.isArray(dayObj.sessions)) {
          dayObj.sessions = (dayObj.sessions as unknown[]).filter((s) => {
            if (!s || typeof s !== "object") return false
            const sObj = s as Record<string, unknown>
            return Array.isArray(sObj.exercises) && (sObj.exercises as unknown[]).length > 0
          })
        }
        return dayObj
      })
      .filter((d) => Array.isArray(d.sessions) && (d.sessions as unknown[]).length > 0)

    // Re-number days 1..N to satisfy day ∈ [1..7] when the model emitted 0/8.
    const needsRenumber = days.some((d) => {
      const n = typeof d.day === "number" ? d.day : NaN
      return !Number.isInteger(n) || n < 1 || n > 7
    })
    if (needsRenumber) {
      days.forEach((d, i) => {
        d.day = Math.min(7, i + 1)
      })
    }
    obj.days = days
  }
  return obj
}

function parseSkeleton(json: unknown): PlanSkeleton | null {
  if (!json || typeof json !== "object") return null
  const o = json as Record<string, unknown>
  const totalWeeks = typeof o.totalWeeks === "number" ? o.totalWeeks : null
  const daysPerWeek = typeof o.daysPerWeek === "number" ? o.daysPerWeek : null
  const coachingSummary = typeof o.coachingSummary === "string" ? o.coachingSummary : ""
  const themesRaw = Array.isArray(o.weekThemes) ? o.weekThemes : []
  const weekThemes: PlanSkeleton["weekThemes"] = []
  for (const t of themesRaw) {
    if (!t || typeof t !== "object") continue
    const tt = t as Record<string, unknown>
    const theme = typeof tt.theme === "string" ? tt.theme : null
    if (!theme) continue
    const entry: { theme: string; deload?: boolean } = { theme }
    if (typeof tt.deload === "boolean") entry.deload = tt.deload
    weekThemes.push(entry)
  }
  const citations = Array.isArray(o.citations)
    ? (o.citations.filter((c) => typeof c === "string") as string[])
    : undefined

  if (!totalWeeks || !daysPerWeek || weekThemes.length === 0) return null

  // Tolerate small mismatches: pad with a generic theme, or trim if too many.
  let normalizedThemes = weekThemes
  if (weekThemes.length < totalWeeks) {
    const lastTheme = weekThemes[weekThemes.length - 1]?.theme ?? "Accumulation"
    while (normalizedThemes.length < totalWeeks) {
      normalizedThemes.push({ theme: lastTheme })
    }
  } else if (weekThemes.length > totalWeeks) {
    normalizedThemes = weekThemes.slice(0, totalWeeks)
  }

  return {
    totalWeeks,
    daysPerWeek,
    coachingSummary,
    weekThemes: normalizedThemes,
    citations,
  }
}

function finalizePlan(
  inputs: AIPlanInputs,
  fromModel: {
    totalWeeks: number
    daysPerWeek: number
    weeks: AIPlanWeek[]
    coachingSummary: string
    citations?: string[]
  },
): AIPlan {
  // Provide a non-empty fallback for coachingSummary so the schema's min(1)
  // never blocks an otherwise-valid plan when the model omits it.
  const summary =
    typeof fromModel.coachingSummary === "string" && fromModel.coachingSummary.trim().length > 0
      ? fromModel.coachingSummary
      : "Plan personnalisé généré. Suis la progression semaine par semaine, écoute ton corps et adapte si besoin."

  const candidate: AIPlan = {
    id: makePlanId(),
    createdAt: new Date().toISOString(),
    inputs,
    ...fromModel,
    coachingSummary: summary,
  }

  // Final guard: if the assembled plan doesn't match the strict schema we'll
  // get a much friendlier error here than at storage/viewer time. Throw with
  // the FIRST failing path so the UI can surface something diagnosable instead
  // of a generic "Erreur de génération" at the very end.
  const verified = aiPlanSchema.safeParse(candidate)
  if (!verified.success) {
    const issue = verified.error.issues[0]
    const where = issue ? `${issue.path.join(".") || "(root)"}: ${issue.message}` : "structure invalide"
    throw new Error(`Plan final invalide (${where}). Réessaie sans cache.`)
  }
  return verified.data
}

/**
 * Asks the model to regenerate one specific week. Returns the new week,
 * which the caller should splice into the existing plan.
 */
export async function regenerateWeek(
  plan: AIPlan,
  weekNumber: number,
): Promise<AIPlan["weeks"][number]> {
  const target = plan.weeks.find((w) => w.week === weekNumber)
  if (!target) throw new Error(`Semaine ${weekNumber} introuvable`)

  const ragContext = await retrieveContext(plan.inputs).catch(() => "")

  const raw = await callChat({
    messages: [
      { role: "system", content: AI_PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildSingleWeekUserMessage(
          plan.inputs,
          {
            weekNumber,
            totalWeeks: plan.totalWeeks,
            daysPerWeek: plan.daysPerWeek,
            theme: target.theme,
            deload: target.deload,
          },
          ragContext,
        ),
      },
    ],
    maxTokens: SINGLE_WEEK_TOKENS,
    jsonMode: true,
  })
  const json = extractJsonObject(raw)
  const parsed = aiPlanWeekSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error("Réponse invalide pour la régénération de semaine.")
  }
  return parsed.data
}
