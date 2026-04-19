import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  CircleCheck as CheckCircle2,
  Trash2,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { cn } from "@/lib/utils"
import {
  type AIPlan,
  type AIPlanInputs,
  aiPlanInputsSchema,
} from "@/lib/aiPlan/schema"
import { generatePlan, getRecentTokensUsed, type GenerateProgress } from "@/lib/aiPlan/api"
import {
  getAIPlan,
  getAIPlanInputs,
  resetAIPlan,
  setActiveProgram,
  setAIPlan,
  setAIPlanInputs,
} from "@/lib/aiPlan/storage"
import { PlanReviewSummary } from "@/components/ai-plan/PlanReviewSummary"
import { PlanWeeklyView } from "@/components/ai-plan/PlanWeeklyView"
import { getTodaysHrv, getHrv7dAverage } from "@/lib/helioStrap"
import { wipeAllTrainhardKeys } from "@/lib/storageKeys"

/**
 * Broadcasts that the AI plan / active program changed in storage. Other
 * components (notably ProgramHome, which lives in a sibling swipe-tab pane and
 * doesn't unmount when the user navigates back to it) listen for this event
 * to refresh their view of the plan.
 */
function notifyAIPlanChanged() {
  try {
    window.dispatchEvent(new Event("trainhard:ai-plan-changed"))
  } catch {
    /* ignore — environments without window/CustomEvent support */
  }
}

interface PlanBuilderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Notified after a plan is generated (so parent can switch active program). */
  onPlanGenerated?: (plan: AIPlan) => void
  /** Notified when user resets — parent should refresh state from storage. */
  onResetAIPlan?: () => void
  /** Notified when user does a full reset — parent should send back to Welcome. */
  onFullReset?: () => void
  /**
   * Notified when the user enters/changes their first name in the builder.
   * Parent can persist it as the app-wide display name.
   */
  onUserNameUpdate?: (firstName: string) => void
}

type Mode = "builder" | "viewer"
type Stage = "form" | "generating" | "result" | "error"

function progressLabel(p: GenerateProgress | null): string {
  if (!p) return "Génération en cours…"
  switch (p.phase) {
    case "cache":
      return "Plan trouvé (cache)…"
    case "rag":
      return "Recherche scientifique…"
    case "plan":
      return "Génération du plan…"
    case "skeleton":
      return "Construction du squelette…"
    case "week":
      return "Détail des semaines clés…"
    case "extrapolate":
      return "Progression automatique…"
    case "rate-limited":
      return "Optimisation en cours…"
    default:
      return "Génération en cours…"
  }
}

/**
 * Animated bar that fills smoothly over `waitMs`. Used during the
 * Groq-rate-limit pause so the wait feels intentional rather than alarming.
 */
function RateLimitBar({ waitMs }: { waitMs: number }) {
  const [pct, setPct] = useState(0)
  const [remainingS, setRemainingS] = useState(Math.ceil(waitMs / 1000))

  useEffect(() => {
    const start = Date.now()
    let raf: number
    const tick = () => {
      const elapsed = Date.now() - start
      const ratio = Math.min(1, elapsed / waitMs)
      // Ease-out so the start moves quickly and the end settles in.
      const eased = 1 - Math.pow(1 - ratio, 1.6)
      setPct(eased * 100)
      setRemainingS(Math.max(0, Math.ceil((waitMs - elapsed) / 1000)))
      if (ratio < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [waitMs])

  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      <div className="w-56 h-1 rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full bg-white rounded-full"
          style={{
            width: `${pct}%`,
            transition: "width 80ms linear",
            boxShadow: "0 0 12px rgba(255,255,255,0.4)",
          }}
        />
      </div>
      <p className="text-[10px] text-white/45 font-extrabold tracking-widest uppercase nk-num">
        Resuming in {remainingS}s
      </p>
    </div>
  )
}

function defaultInputs(): AIPlanInputs {
  return {
    firstName: undefined,
    sex: "male",
    age: 25,
    heightValue: 175,
    heightUnit: "cm",
    weightValue: 70,
    weightUnit: "kg",
    experience: "1y",
    sport: "football",
    sportFreeText: undefined,
    footballPosition: "midfielder",
    dominantFoot: "right",
    primaryGoal: "sport-specific",
    secondaryGoals: [],
    equipment: ["bodyweight"],
    injuries: undefined,
    sessionLengthMin: 60,
    daysPerWeek: 4,
    preferredRestDays: [],
    planLength: { unit: "weeks", value: 8 },
  }
}

const STEPS = [
  "Profil",
  "Sport",
  "Objectifs",
  "Contraintes",
  "Calendrier",
  "Durée",
  "Récap",
] as const

export function PlanBuilderSheet({
  open,
  onOpenChange,
  onPlanGenerated,
  onResetAIPlan,
  onFullReset,
  onUserNameUpdate,
}: PlanBuilderSheetProps) {
  const [mode, setMode] = useState<Mode>("builder")
  const [stage, setStage] = useState<Stage>("form")
  const [step, setStep] = useState(0)
  const [inputs, setInputs] = useState<AIPlanInputs>(() => getAIPlanInputs() ?? defaultInputs())
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<AIPlan | null>(() => getAIPlan())
  const [stepError, setStepError] = useState<string | null>(null)

  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [confirmFullResetOpen, setConfirmFullResetOpen] = useState(false)
  const [fullResetTyped, setFullResetTyped] = useState("")
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState<GenerateProgress | null>(null)

  // When reopened, refresh plan from storage and switch tabs based on whether a plan exists.
  useEffect(() => {
    if (!open) return
    const stored = getAIPlan()
    setPlan(stored)
    setMode(stored ? "viewer" : "builder")
    setStage("form")
    setStep(0)
    setInputs(getAIPlanInputs() ?? defaultInputs())
    setError(null)
    setStepError(null)
  }, [open])

  // Auto-advance / step validation per page (lightweight, not full schema until submit).
  function validateStep(idx: number): string | null {
    if (idx === 0) {
      if (!(inputs.age >= 10 && inputs.age <= 99)) return "Âge invalide (10–99)"
      if (!(inputs.heightValue >= 50 && inputs.heightValue <= 260)) return "Taille invalide"
      if (!(inputs.weightValue >= 20 && inputs.weightValue <= 400)) return "Poids invalide"
    }
    if (idx === 1) {
      if (inputs.sport === "other" && !(inputs.sportFreeText && inputs.sportFreeText.trim().length > 0)) {
        return "Précise ton sport"
      }
    }
    if (idx === 3 && inputs.equipment.length === 0) {
      return "Choisis au moins un équipement"
    }
    return null
  }

  const canGoNext = useMemo(() => validateStep(step) == null, [step, inputs])

  const goNext = () => {
    const e = validateStep(step)
    if (e) {
      setStepError(e)
      return
    }
    setStepError(null)
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  const goPrev = () => {
    setStepError(null)
    setStep((s) => Math.max(0, s - 1))
  }

  async function handleGenerate(opts: { bypassCache?: boolean } = {}) {
    const hrvToday = getTodaysHrv()
    const hrv7d = getHrv7dAverage()
    const enriched: AIPlanInputs = {
      ...inputs,
      freshnessHint:
        hrvToday != null || hrv7d != null
          ? { hrvToday: hrvToday ?? null, hrv7dAvg: hrv7d ?? null }
          : undefined,
    }
    const parsed = aiPlanInputsSchema.safeParse(enriched)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Données invalides")
      setStage("error")
      return
    }
    setMode("builder")
    setStage("generating")
    setError(null)
    setProgress(null)
    try {
      const plan = await generatePlan(parsed.data, {
        onProgress: (p) => setProgress(p),
        bypassCache: opts.bypassCache,
      })
      setAIPlanInputs(parsed.data)
      setAIPlan(plan)
      setActiveProgram("ai")
      setPlan(plan)
      setStage("result")
      setProgress(null)
      // Propagate the chosen first name to the parent (App) so it shows up
      // everywhere (Profile header, Today eyebrow, AI Coach context, etc.).
      if (parsed.data.firstName && parsed.data.firstName.length > 0) {
        onUserNameUpdate?.(parsed.data.firstName)
      }
      notifyAIPlanChanged()
      onPlanGenerated?.(plan)
    } catch (e) {
      // Always log the raw error for debugging — the UI message is intentionally
      // user-friendly, but a developer looking at the console should see the
      // full stack/context that caused the failure.
      console.error("[PlanBuilderSheet] Plan generation failed:", e)
      const message =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : "Erreur de génération inconnue. Vérifie ta connexion ou réessaie sans cache."
      setError(message)
      setStage("error")
      setProgress(null)
    }
  }

  function handleResetAIPlan() {
    resetAIPlan()
    setPlan(null)
    setStage("form")
    setStep(0)
    setMode("builder")
    setInputs(defaultInputs())
    setConfirmResetOpen(false)
    notifyAIPlanChanged()
    onResetAIPlan?.()
  }

  function handleFullReset() {
    wipeAllTrainhardKeys()
    setConfirmFullResetOpen(false)
    setFullResetTyped("")
    onOpenChange(false)
    notifyAIPlanChanged()
    onFullReset?.()
  }

  function handleApplyPlan() {
    if (!plan) return
    setActiveProgram("ai")
    setCopied(true) // brief "Appliqué" confirmation before closing
    setTimeout(() => {
      setCopied(false)
      notifyAIPlanChanged()
      onPlanGenerated?.(plan)
      onOpenChange(false)
    }, 600)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col overflow-hidden bg-[#0a0a0a] border-white/10 text-white p-0"
        >
          <SheetHeader className="border-b border-white/10 px-5 py-4">
            <SheetTitle className="flex items-center gap-2.5 text-white text-xl font-black tracking-tight uppercase">
              <Sparkles className="size-4" />
              AI Plan
            </SheetTitle>
            <SheetDescription className="text-white/55 text-xs leading-relaxed">
              Answer a few questions and the AI builds your training plan.
            </SheetDescription>

            {plan && (
              <div className="flex gap-1 mt-3 p-1 rounded-full bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode("viewer")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-full text-[11px] font-extrabold uppercase tracking-widest transition-all",
                    mode === "viewer"
                      ? "bg-white text-black"
                      : "text-white/55 hover:text-white",
                  )}
                >
                  My Plan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("builder")
                    setStage("form")
                    setStep(0)
                  }}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-full text-[11px] font-extrabold uppercase tracking-widest transition-all",
                    mode === "builder"
                      ? "bg-white text-black"
                      : "text-white/55 hover:text-white",
                  )}
                >
                  Rebuild
                </button>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {mode === "viewer" && plan && (
              <PlanWeeklyView
                plan={plan}
                onUpdatePlan={(next) => {
                  setPlan(next)
                  setAIPlan(next)
                }}
              />
            )}

            {mode === "builder" && stage === "form" && (
              <BuilderForm
                step={step}
                inputs={inputs}
                onChange={setInputs}
                stepError={stepError}
              />
            )}

            {mode === "builder" && stage === "generating" && (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="relative">
                  <Loader2 className="size-10 animate-spin text-white" strokeWidth={2.5} />
                  <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 60px rgba(255,255,255,0.2)" }} />
                </div>
                <div className="space-y-1">
                  <p className="nk-eyebrow text-white/40">Generating</p>
                  <p className="font-extrabold text-base text-white">
                    {progressLabel(progress)}
                  </p>
                </div>
                {progress?.phase === "week" && progress.current && progress.total ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-xs text-white/55 nk-num">
                      Week {progress.current} / {progress.total}
                    </p>
                    <div className="w-56 h-1 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full bg-white transition-all rounded-full"
                        style={{
                          width: `${(progress.current / progress.total) * 100}%`,
                          boxShadow: "0 0 12px rgba(255,255,255,0.4)",
                        }}
                      />
                    </div>
                  </div>
                ) : progress?.phase === "rate-limited" ? (
                  <RateLimitBar waitMs={progress.waitMs ?? 5000} />
                ) : (
                  <p className="text-xs text-white/45 max-w-xs leading-relaxed">
                    The AI is analyzing your profile and building your plan. This
                    can take 10–30 seconds.
                  </p>
                )}
              </div>
            )}

            {mode === "builder" && stage === "result" && plan && (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <div className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-300" strokeWidth={3} />
                    <p className="nk-eyebrow text-emerald-300">Plan Generated</p>
                  </div>
                  <p className="text-sm font-extrabold text-white mt-1.5 nk-num">
                    {plan.totalWeeks} Weeks · {plan.daysPerWeek} Days / Week
                  </p>
                </div>

                <div className="nk-card p-5 space-y-3">
                  <p className="nk-eyebrow text-white/40">Coach Summary</p>
                  <p className="text-sm text-white/85 leading-relaxed">
                    {plan.coachingSummary}
                  </p>
                  {plan.citations && plan.citations.length > 0 && (
                    <ul className="space-y-1.5 mt-3 pt-3 border-t border-white/8">
                      {plan.citations.map((c, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[11px] text-white/55 leading-relaxed"
                        >
                          <span className="text-white/30 shrink-0">→</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMode("viewer")}
                  className="nk-cta"
                >
                  View Weekly Plan
                </button>
              </div>
            )}

            {mode === "builder" && stage === "error" && (
              <div className="space-y-3">
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-red-300" />
                    <p className="nk-eyebrow text-red-300">Failed</p>
                  </div>
                  <p className="text-xs text-white/65 mt-1.5 leading-relaxed">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStage("form")
                    setStep(STEPS.length - 1)
                  }}
                  className="nk-cta-ghost"
                >
                  Back to Summary
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate({ bypassCache: true })}
                  className="nk-cta"
                >
                  <Sparkles className="size-4" />
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Footer: navigation + actions */}
          <div className="border-t border-white/10 px-5 py-4 space-y-3 bg-[#0a0a0a]">
            {mode === "builder" && stage === "form" && (
              <>
                <div className="flex gap-1">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 h-1 rounded-full transition-all",
                        i <= step ? "bg-white" : "bg-white/12",
                      )}
                      style={
                        i <= step
                          ? { boxShadow: "0 0 6px rgba(255,255,255,0.3)" }
                          : undefined
                      }
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={step === 0}
                    className="flex items-center gap-1 text-[11px] font-extrabold tracking-widest uppercase text-white/55 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2"
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </button>
                  <p className="nk-eyebrow text-white/35 nk-num">
                    Step {step + 1} / {STEPS.length}
                  </p>
                  {step < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canGoNext}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-black text-[11px] font-extrabold uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-white/90"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerate()}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white text-black text-[11px] font-extrabold uppercase tracking-widest hover:bg-white/90 transition-all"
                    >
                      <Sparkles className="size-3.5" />
                      Generate
                    </button>
                  )}
                </div>
              </>
            )}

            {mode === "viewer" && plan && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleApplyPlan}
                  className="nk-cta"
                >
                  <CheckCircle2 className="size-4" />
                  {copied ? "Applied" : "Apply Plan"}
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate({ bypassCache: true })}
                  className="nk-cta-ghost"
                >
                  <Sparkles className="size-4" />
                  Regenerate (no cache)
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="nk-cta-ghost !text-red-300"
                  style={{ borderColor: "rgba(248,113,113,0.3)" }}
                >
                  <Trash2 className="size-4" />
                  Delete Plan
                </button>
                <p className="text-[10px] text-white/35 text-center font-bold tracking-widest uppercase nk-num">
                  ~{getRecentTokensUsed().toLocaleString()} tokens used · 60s
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmFullResetOpen(true)}
                  className="text-[10px] font-extrabold tracking-widest uppercase text-white/35 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 py-2"
                >
                  <RotateCcw className="size-3" />
                  Full App Reset
                </button>
              </div>
            )}

            {mode === "builder" && (stage === "result" || stage === "error") && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="nk-cta-ghost"
              >
                Close
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset AI plan only */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent className="bg-[#141414] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight uppercase text-white">
              Delete AI Plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/55 text-sm leading-relaxed">
              Your answers and plan will be erased. You'll go back to the static
              12-week program.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAIPlan}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full app reset (destructive, second guard) */}
      <AlertDialog open={confirmFullResetOpen} onOpenChange={setConfirmFullResetOpen}>
        <AlertDialogContent className="bg-[#141414] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight uppercase text-white">
              Full Reset?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/55 text-sm leading-relaxed">
              This erases all your local data: profile, AI plan, completed
              sessions, freshness, HRV, baselines, sound, etc. Irreversible.
              <br />
              <br />
              Type <strong className="text-white">RESET</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={fullResetTyped}
            onChange={(e) => setFullResetTyped(e.target.value)}
            placeholder="RESET"
            className="font-mono bg-white/5 border-white/15 text-white placeholder:text-white/30 font-extrabold"
          />
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              onClick={() => setFullResetTyped("")}
              className="bg-transparent border-white/15 text-white hover:bg-white/5 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={fullResetTyped.trim().toUpperCase() !== "RESET"}
              onClick={handleFullReset}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold disabled:opacity-30"
            >
              Erase Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ============================================================
 * Builder form pages — kept inline to keep file count manageable.
 * ============================================================ */

interface BuilderFormProps {
  step: number
  inputs: AIPlanInputs
  onChange: (next: AIPlanInputs) => void
  stepError: string | null
}

function BuilderForm({ step, inputs, onChange, stepError }: BuilderFormProps) {
  const set = (patch: Partial<AIPlanInputs>) => onChange({ ...inputs, ...patch })

  return (
    <div className="space-y-4">
      {stepError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {stepError}
        </div>
      )}

      {step === 0 && <Step0Profile inputs={inputs} set={set} />}
      {step === 1 && <Step1Sport inputs={inputs} set={set} />}
      {step === 2 && <Step2Goals inputs={inputs} set={set} />}
      {step === 3 && <Step3Constraints inputs={inputs} set={set} />}
      {step === 4 && <Step4Schedule inputs={inputs} set={set} />}
      {step === 5 && <Step5Length inputs={inputs} set={set} />}
      {step === 6 && <PlanReviewSummary inputs={inputs} />}
    </div>
  )
}

interface StepProps {
  inputs: AIPlanInputs
  set: (patch: Partial<AIPlanInputs>) => void
}

/** Defaults used when a field is blurred while empty. */
const PROFILE_DEFAULTS = { age: 25, height: 175, weight: 70 } as const

/** Allow only digits + optional decimal point during typing. */
const NUMERIC_INPUT_RE = /^\d*\.?\d*$/

function clampNumber(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function Step0Profile({ inputs, set }: StepProps) {
  // Local string state lets the user erase / retype freely. We only clamp on
  // blur, so typing "27" is never overwritten by a midstream "10" clamp.
  const [ageStr, setAgeStr] = useState(String(inputs.age))
  const [heightStr, setHeightStr] = useState(String(inputs.heightValue))
  const [weightStr, setWeightStr] = useState(String(inputs.weightValue))

  // Re-sync local strings if `inputs` changes externally (e.g. saved-inputs load).
  useEffect(() => {
    setAgeStr(String(inputs.age))
  }, [inputs.age])
  useEffect(() => {
    setHeightStr(String(inputs.heightValue))
  }, [inputs.heightValue])
  useEffect(() => {
    setWeightStr(String(inputs.weightValue))
  }, [inputs.weightValue])

  const onAgeBlur = () => {
    const n = parseInt(ageStr, 10)
    const v = ageStr === "" ? PROFILE_DEFAULTS.age : clampNumber(n, 10, 99, PROFILE_DEFAULTS.age)
    setAgeStr(String(v))
    set({ age: v })
  }
  const onHeightBlur = () => {
    const n = parseFloat(heightStr)
    const v = heightStr === "" ? PROFILE_DEFAULTS.height : clampNumber(n, 50, 260, PROFILE_DEFAULTS.height)
    setHeightStr(String(v))
    set({ heightValue: v })
  }
  const onWeightBlur = () => {
    const n = parseFloat(weightStr)
    const v = weightStr === "" ? PROFILE_DEFAULTS.weight : clampNumber(n, 20, 400, PROFILE_DEFAULTS.weight)
    setWeightStr(String(v))
    set({ weightValue: v })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-base tracking-tight">Profile</h3>

      <div>
        <Label htmlFor="firstName" className="mb-1.5">First Name</Label>
        <Input
          id="firstName"
          type="text"
          autoComplete="given-name"
          placeholder="e.g. Ruspil"
          value={inputs.firstName ?? ""}
          onChange={(e) => set({ firstName: e.target.value })}
          onBlur={(e) => {
            const trimmed = e.target.value.trim()
            set({ firstName: trimmed.length > 0 ? trimmed : undefined })
          }}
        />
      </div>

      <div>
        <Label className="mb-1.5">Sex</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["male", "female", "other"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              variant={inputs.sex === v ? "default" : "outline"}
              size="sm"
              onClick={() => set({ sex: v })}
            >
              {v === "male" ? "Male" : v === "female" ? "Female" : "Other"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="age" className="mb-1.5">Âge</Label>
          <Input
            id="age"
            type="text"
            inputMode="numeric"
            value={ageStr}
            onChange={(e) => {
              const v = e.target.value
              if (v === "" || NUMERIC_INPUT_RE.test(v)) setAgeStr(v)
            }}
            onBlur={onAgeBlur}
          />
        </div>

        <div>
          <Label className="mb-1.5">Unités</Label>
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              variant={inputs.heightUnit === "cm" ? "default" : "outline"}
              size="sm"
              onClick={() => set({ heightUnit: "cm", weightUnit: "kg" })}
            >
              cm/kg
            </Button>
            <Button
              type="button"
              variant={inputs.heightUnit === "in" ? "default" : "outline"}
              size="sm"
              onClick={() => set({ heightUnit: "in", weightUnit: "lb" })}
            >
              in/lb
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="height" className="mb-1.5">Taille ({inputs.heightUnit})</Label>
          <Input
            id="height"
            type="text"
            inputMode="decimal"
            value={heightStr}
            onChange={(e) => {
              const v = e.target.value
              if (v === "" || NUMERIC_INPUT_RE.test(v)) setHeightStr(v)
            }}
            onBlur={onHeightBlur}
          />
        </div>
        <div>
          <Label htmlFor="weight" className="mb-1.5">Poids ({inputs.weightUnit})</Label>
          <Input
            id="weight"
            type="text"
            inputMode="decimal"
            value={weightStr}
            onChange={(e) => {
              const v = e.target.value
              if (v === "" || NUMERIC_INPUT_RE.test(v)) setWeightStr(v)
            }}
            onBlur={onWeightBlur}
          />
        </div>
      </div>
    </div>
  )
}

function Step1Sport({ inputs, set }: StepProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-base tracking-tight">Expérience &amp; sport</h3>

      <div>
        <Label className="mb-1.5">Niveau d&apos;entraînement</Label>
        <Select value={inputs.experience} onValueChange={(v) => set({ experience: v as AIPlanInputs["experience"] })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Débutant (0)</SelectItem>
            <SelectItem value="1y">~1 an</SelectItem>
            <SelectItem value="3y">~3 ans</SelectItem>
            <SelectItem value="5y+">5+ ans</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="mb-1.5">Sport principal</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(["football", "running", "gym", "basketball", "cycling", "other", "none"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              variant={inputs.sport === s ? "default" : "outline"}
              size="sm"
              onClick={() => set({ sport: s })}
              className="text-xs"
            >
              {s === "football"
                ? "Foot"
                : s === "running"
                  ? "Run"
                  : s === "gym"
                    ? "Gym"
                    : s === "basketball"
                      ? "Basket"
                      : s === "cycling"
                        ? "Vélo"
                        : s === "other"
                          ? "Autre"
                          : "Aucun"}
            </Button>
          ))}
        </div>
      </div>

      {inputs.sport === "other" && (
        <div>
          <Label htmlFor="sport-text" className="mb-1.5">Précise ton sport</Label>
          <Input
            id="sport-text"
            value={inputs.sportFreeText ?? ""}
            onChange={(e) => set({ sportFreeText: e.target.value })}
            placeholder="ex: handball"
          />
        </div>
      )}

      {inputs.sport === "football" && (
        <>
          <div>
            <Label className="mb-1.5">Poste</Label>
            <Select
              value={inputs.footballPosition ?? "midfielder"}
              onValueChange={(v) => set({ footballPosition: v as AIPlanInputs["footballPosition"] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="goalkeeper">Gardien</SelectItem>
                <SelectItem value="defender">Défenseur</SelectItem>
                <SelectItem value="midfielder">Milieu</SelectItem>
                <SelectItem value="winger">Ailier</SelectItem>
                <SelectItem value="striker">Attaquant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5">Pied fort</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["left", "right", "both"] as const).map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={inputs.dominantFoot === v ? "default" : "outline"}
                  size="sm"
                  onClick={() => set({ dominantFoot: v })}
                >
                  {v === "left" ? "Gauche" : v === "right" ? "Droit" : "Ambi"}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const PRIMARY_GOALS: ReadonlyArray<{ value: AIPlanInputs["primaryGoal"]; label: string }> = [
  { value: "strength", label: "Force" },
  { value: "power", label: "Puissance" },
  { value: "hypertrophy", label: "Hypertrophie" },
  { value: "endurance", label: "Endurance" },
  { value: "fat-loss", label: "Perte de gras" },
  { value: "sport-specific", label: "Sport spé" },
  { value: "general-fitness", label: "Forme générale" },
]

function Step2Goals({ inputs, set }: StepProps) {
  const toggleSecondary = (g: AIPlanInputs["primaryGoal"]) => {
    const has = inputs.secondaryGoals.includes(g)
    if (has) {
      set({ secondaryGoals: inputs.secondaryGoals.filter((x) => x !== g) })
    } else if (inputs.secondaryGoals.length < 2 && g !== inputs.primaryGoal) {
      set({ secondaryGoals: [...inputs.secondaryGoals, g] })
    }
  }
  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-base tracking-tight">Objectifs</h3>

      <div>
        <Label className="mb-1.5">Objectif principal</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRIMARY_GOALS.map((g) => (
            <Button
              key={g.value}
              type="button"
              variant={inputs.primaryGoal === g.value ? "default" : "outline"}
              size="sm"
              onClick={() => set({ primaryGoal: g.value, secondaryGoals: inputs.secondaryGoals.filter((x) => x !== g.value) })}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Secondaires (optionnel, max 2)</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRIMARY_GOALS.filter((g) => g.value !== inputs.primaryGoal).map((g) => {
            const active = inputs.secondaryGoals.includes(g.value)
            return (
              <Button
                key={g.value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSecondary(g.value)}
              >
                {g.label}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const EQUIPMENT: ReadonlyArray<{ value: AIPlanInputs["equipment"][number]; label: string }> = [
  { value: "bodyweight", label: "Poids du corps" },
  { value: "full-gym", label: "Salle de gym" },
  { value: "cardio-machines", label: "Cardio" },
]

function Step3Constraints({ inputs, set }: StepProps) {
  const toggleEq = (v: AIPlanInputs["equipment"][number]) => {
    const has = inputs.equipment.includes(v)
    set({
      equipment: has
        ? inputs.equipment.filter((x) => x !== v)
        : [...inputs.equipment, v],
    })
  }
  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-base tracking-tight">Contraintes</h3>

      <div>
        <Label className="mb-1.5">Équipement disponible</Label>
        <div className="grid grid-cols-1 gap-2">
          {EQUIPMENT.map((eq) => {
            const active = inputs.equipment.includes(eq.value)
            return (
              <button
                key={eq.value}
                type="button"
                onClick={() => toggleEq(eq.value)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors text-left",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-input hover:bg-muted/40",
                )}
              >
                <Checkbox checked={active} onCheckedChange={() => toggleEq(eq.value)} />
                <span>{eq.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="injuries" className="mb-1.5">Blessures / zones à éviter</Label>
        <Input
          id="injuries"
          value={inputs.injuries ?? ""}
          onChange={(e) => set({ injuries: e.target.value })}
          placeholder="ex: épaule droite, lombaires…"
        />
      </div>

      <div>
        <Label className="mb-1.5">Durée max d&apos;une séance: {inputs.sessionLengthMin} min</Label>
        <Slider
          min={15}
          max={120}
          step={5}
          value={[inputs.sessionLengthMin]}
          onValueChange={(vals) => set({ sessionLengthMin: vals[0] ?? 60 })}
        />
      </div>
    </div>
  )
}

function Step4Schedule({ inputs, set }: StepProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-base tracking-tight">Calendrier</h3>

      <div>
        <Label className="mb-1.5">Jours par semaine</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {([1, 2, 3, 4, 5, 6, "auto"] as const).map((d) => (
            <Button
              key={String(d)}
              type="button"
              variant={inputs.daysPerWeek === d ? "default" : "outline"}
              size="sm"
              onClick={() => set({ daysPerWeek: d })}
            >
              {d === "auto" ? "Auto" : String(d)}
            </Button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          “Auto” laisse l&apos;IA choisir selon ton profil.
        </p>
      </div>
    </div>
  )
}

type PlanLengthUnit = AIPlanInputs["planLength"]["unit"]

const UNIT_PRESETS: Record<Exclude<PlanLengthUnit, "auto">, number[]> = {
  days: [7, 14, 21, 30, 45, 60, 90],
  weeks: [4, 6, 8, 10, 12, 16, 20],
  months: [1, 2, 3, 4, 6, 8, 12],
}

function Step5Length({ inputs, set }: StepProps) {
  const unit = inputs.planLength.unit
  const value = inputs.planLength.value

  const setUnit = (u: PlanLengthUnit) => {
    if (u === "auto") {
      set({ planLength: { unit: "auto", value: 0 } })
      return
    }
    // Pick a sensible default value for the new unit (mid of presets).
    const presets = UNIT_PRESETS[u]
    const fallback = presets[Math.floor(presets.length / 2)]
    set({ planLength: { unit: u, value: fallback } })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-extrabold text-base tracking-tight">Durée du plan</h3>

      <div>
        <Label className="mb-1.5">Unité</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["days", "weeks", "months", "auto"] as const).map((u) => (
            <Button
              key={u}
              type="button"
              variant={unit === u ? "default" : "outline"}
              size="sm"
              onClick={() => setUnit(u)}
            >
              {u === "days" ? "Jours" : u === "weeks" ? "Semaines" : u === "months" ? "Mois" : "Auto"}
            </Button>
          ))}
        </div>
      </div>

      {unit !== "auto" && (
        <>
          <div>
            <Label className="mb-1.5">
              Choix rapide ({unit === "days" ? "jours" : unit === "weeks" ? "semaines" : "mois"})
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {UNIT_PRESETS[unit].map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={value === v ? "default" : "outline"}
                  size="sm"
                  onClick={() => set({ planLength: { unit, value: v } })}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="plan-length-value" className="mb-1.5">
              Ou personnalisé
            </Label>
            <Input
              id="plan-length-value"
              type="text"
              inputMode="numeric"
              value={String(value)}
              onChange={(e) => {
                const v = e.target.value
                if (v === "" || /^\d+$/.test(v)) {
                  const n = parseInt(v || "0", 10)
                  set({ planLength: { unit, value: n } })
                }
              }}
              onBlur={() => {
                const minMax: Record<Exclude<PlanLengthUnit, "auto">, [number, number]> = {
                  days: [7, 90],
                  weeks: [1, 24],
                  months: [1, 12],
                }
                const [min, max] = minMax[unit]
                const clamped = Math.max(min, Math.min(max, value || min))
                if (clamped !== value) set({ planLength: { unit, value: clamped } })
              }}
            />
          </div>
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Pour 6+ semaines, l&apos;IA inclura au moins une semaine de décharge (deload). Au-delà de 12 semaines, la génération est plus longue (semaine par semaine).
      </p>
    </div>
  )
}
