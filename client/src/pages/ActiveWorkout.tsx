import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react"
import {
  MessageCircle,
  Check,
  Info,
  CreditCard as Edit,
  X,
  Dumbbell,
  PersonStanding,
  Activity,
  Zap,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type Session, type WorkoutExercise } from "@/lib/workoutData"
import { HRMWidget } from "@/components/HRMWidget"
import { ExerciseWorkTimer } from "@/components/ExerciseWorkTimer"
import { ExerciseDemoVideo } from "@/components/ExerciseDemoVideo"
import {
  baselineKeyForExercise,
  canonicalExerciseId,
  classifyLoad,
  isLoadBearing,
  lbsFromPercent,
  parsePercentRange,
} from "@/lib/exerciseLoad"
import { isTimeBasedExercise, parseWorkDurationSeconds } from "@/lib/exerciseTimer"
import { defaultStartingWeightLb } from "@/lib/defaultStartingWeights"
import { getAutoAdjustEnabled, getTodaysFreshness } from "@/lib/freshness"
import { SetEffortFeedback } from "@/components/SetEffortFeedback"
import {
  appendSessionSetLog,
  getLiftBaselines,
  getSuggestion,
  getUseKg,
  setLiftBaseline,
  setSuggestion,
  setUseKg,
  getBothSidesPlank,
  setBothSidesPlank,
  kgToLb,
  lbToKg,
} from "@/lib/liftStorage"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { playRestComplete } from "@/lib/workoutSounds"
import { SwipeStack } from "@/components/app/SwipeStack"

// AI Chat is opened on demand only — defer its bundle (and the AI hook deps).
const AIChatPanel = lazy(() =>
  import("@/components/AIChatPanel").then((m) => ({ default: m.AIChatPanel })),
)

interface ActiveWorkoutProps {
  session: Session
  day?: number
  onFinish: (durationSeconds: number, percentComplete: number) => void
}

const WEEK_KEY = "trainhard-current-week"

function getSavedWeek(): number {
  try {
    const raw = localStorage.getItem(WEEK_KEY)
    const n = raw ? parseInt(raw, 10) : 1
    return Number.isNaN(n) ? 1 : Math.min(Math.max(n, 1), 12)
  } catch {
    return 1
  }
}

function ExerciseVisual({ exercise, isDone }: { exercise: WorkoutExercise; isDone: boolean }) {
  const lower = exercise.name.toLowerCase()
  let Icon = Dumbbell
  if (lower.includes("pull") || lower.includes("row") || lower.includes("slam") || lower.includes("swing")) {
    Icon = Activity
  } else if (
    lower.includes("squat") ||
    lower.includes("step") ||
    lower.includes("jump") ||
    lower.includes("lunge") ||
    lower.includes("car") ||
    lower.includes("climb")
  ) {
    Icon = PersonStanding
  }

  return (
    <div className="flex-1 flex items-center justify-center relative min-h-[220px] py-6">
      <div className={cn("transition-opacity duration-300", isDone ? "opacity-15" : "opacity-100")}>
        <div className="size-40 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon className="size-16 text-white/70" strokeWidth={1.3} />
        </div>
      </div>
      {isDone && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-24 rounded-full bg-white text-black flex items-center justify-center">
            <Check className="size-12" strokeWidth={3} />
          </div>
        </div>
      )}
    </div>
  )
}

function SetIndicator({
  currentSet,
  totalSets,
  completedSets,
}: {
  currentSet: number
  totalSets: number
  completedSets: Set<number>
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="nk-eyebrow text-white/40">Set</span>
      {Array.from({ length: totalSets }).map((_, i) => {
        const setNum = i + 1
        const isActive = setNum === currentSet
        const isDone = completedSets.has(setNum)
        return (
          <div key={setNum} className="relative">
            <span
              className={cn(
                "text-base font-black nk-num transition-colors",
                isActive ? "text-white" : isDone ? "text-white/40" : "text-white/25",
              )}
            >
              {setNum}
            </span>
            {isActive && (
              <div className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </div>
        )
      })}
    </div>
  )
}

type Peek = {
  exercise: WorkoutExercise
  set: number
  kind: "set" | "exercise"
  /** Whether the destination set/exercise has already been completed. */
  done: boolean
}

/**
 * Minimal "what's coming next/prev" card shown while the user drags the
 * SwipeStack horizontally. Intentionally light — just gives a hint of the
 * destination, not a full re-render of the heavy active card.
 *
 * When `peek.done` is true, the whole card is blurred + dimmed and stamped
 * with a "DONE" badge so the user knows they're swiping back to a set/exercise
 * they've already finished.
 */
function PeekCard({ peek, side }: { peek: Peek; side: "prev" | "next" }) {
  return (
    <div className="px-5 pt-5 pb-8">
      <div
        className={cn(
          "relative rounded-2xl bg-white/[0.04] border border-white/8 p-6 space-y-4 transition-all",
          peek.done && "opacity-55 blur-[2px]",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="nk-eyebrow text-white/40">
            {side === "prev" ? "← Previous" : "Next →"}
          </span>
          <span className="nk-eyebrow text-white/30">
            {peek.kind === "set" ? "Set" : "Exercise"}
          </span>
        </div>
        <h2 className="nk-h-display line-clamp-3">{peek.exercise.name}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="nk-chip nk-num">
            Set {peek.set}
            <span className="opacity-50"> / {peek.exercise.sets}</span>
          </span>
          {peek.exercise.weight && (
            <span className="nk-chip nk-num">
              {peek.exercise.weight}
              {peek.exercise.weightUnit ? ` ${peek.exercise.weightUnit}` : ""}
            </span>
          )}
          {peek.exercise.reps && (
            <span className="nk-chip nk-num">
              × {peek.exercise.reps}
            </span>
          )}
        </div>
      </div>
      {peek.done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.18)]">
            <Check className="size-3.5" strokeWidth={3} />
            <span className="text-[10px] font-black tracking-[0.22em] uppercase">
              Done
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function RestTimer({ seconds, onDismiss }: { seconds: number; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(seconds)
  const playedEndRef = useRef(false)

  useEffect(() => {
    setRemaining(seconds)
    playedEndRef.current = false
  }, [seconds])

  useEffect(() => {
    if (remaining > 0) {
      const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
      return () => clearTimeout(id)
    }
    if (remaining === 0 && seconds > 0 && !playedEndRef.current) {
      playedEndRef.current = true
      void playRestComplete().finally(() => {
        onDismiss()
      })
    }
  }, [remaining, seconds, onDismiss])

  const progress = seconds > 0 ? remaining / seconds : 0
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0")
  const ss = String(remaining % 60).padStart(2, "0")

  return (
    <div className="relative h-14 mx-5 rounded-full overflow-hidden bg-white/5 border border-white/10">
      <div
        className="absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-linear"
        style={{
          width: `${progress * 100}%`,
          boxShadow: "0 0 24px rgba(255,255,255,0.35)",
        }}
      />
      <div className="relative h-full flex items-center justify-between px-5">
        <div className="flex items-center gap-3 mix-blend-difference">
          <div className="size-1.5 rounded-full bg-white animate-pulse" />
          <span className="font-black text-xs tracking-[0.25em] uppercase text-white">
            Rest
          </span>
          <span className="font-black text-base nk-num text-white tracking-tight">
            {mm}:{ss}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="size-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white shrink-0"
          aria-label="Skip rest"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ActiveWorkout({ session, onFinish }: ActiveWorkoutProps) {
  const exercises = session.exercises
  const [exerciseIdx, setExerciseIdx] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [completedSetsMap, setCompletedSetsMap] = useState<Record<string, Set<number>>>({})
  const [showRest, setShowRest] = useState(false)
  const [restSeconds, setRestSeconds] = useState(60)
  const [startTime] = useState(Date.now())
  const [actionsOpen, setActionsOpen] = useState(false)
  const [difficultyOpen, setDifficultyOpen] = useState(false)
  const [actualLbs, setActualLbs] = useState("")
  const [plankSide, setPlankSide] = useState<"first" | "second">("first")
  const [baselines, setBaselines] = useState(() => getLiftBaselines())
  const [useKg, setUseKgState] = useState(getUseKg)
  const [bothSides, setBothSidesState] = useState(getBothSidesPlank)
  const [baselineInputs, setBaselineInputs] = useState<Record<string, string>>({})
  const [infoOpen, setInfoOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [currentWeek] = useState<number>(() => getSavedWeek())

  const currentExercise = exercises[exerciseIdx]
  const nextExercise = exerciseIdx < exercises.length - 1 ? exercises[exerciseIdx + 1] : null

  const completedSetsForCurrent = completedSetsMap[currentExercise.id] ?? new Set<number>()
  const isCurrentExerciseDone = completedSetsForCurrent.size >= currentExercise.sets
  const isCurrentSetDone = completedSetsForCurrent.has(currentSet)

  const totalSetsCompleted = Object.values(completedSetsMap).reduce((acc, s) => acc + s.size, 0)
  const totalSets = exercises.reduce((acc, e) => acc + e.sets, 0)

  const timeBased = isTimeBasedExercise(currentExercise)
  const workSeconds = useMemo(() => parseWorkDurationSeconds(currentExercise), [currentExercise])
  const secChaque =
    /CHAQUE/i.test(currentExercise.repsLabel) && bothSides && timeBased

  const canonical = canonicalExerciseId(currentExercise.id)
  const baselineKey = baselineKeyForExercise(canonical)
  const loadKind = classifyLoad(currentExercise)
  const defaultLb = defaultStartingWeightLb(canonical, currentWeek)
  const freshnessCoef = useMemo(() => {
    if (!getAutoAdjustEnabled()) return 1
    const today = getTodaysFreshness()
    return today ? today.result.coefficient : 1
  }, [currentExercise.id])
  const adjustedLb = defaultLb != null ? defaultLb * freshnessCoef : null
  const showLoadUi = (isLoadBearing(currentExercise) || defaultLb != null) && !timeBased

  const percentRange = useMemo(() => {
    if (loadKind !== "percent1rm") return null
    return parsePercentRange(currentExercise.weight)
  }, [currentExercise, loadKind])

  const baselineLb = baselines[baselineKey]
  const lbRangeText = useMemo(() => {
    if (!percentRange || baselineLb == null || baselineLb <= 0) return null
    const lo = lbsFromPercent(baselineLb, percentRange.low)
    const hi = lbsFromPercent(baselineLb, percentRange.high)
    return `${lo}–${hi} lb`
  }, [percentRange, baselineLb])

  useEffect(() => {
    setPlankSide("first")
    if (adjustedLb != null) {
      const v = useKg ? lbToKg(adjustedLb) : adjustedLb
      setActualLbs(String(Math.round(v)))
    } else {
      setActualLbs("")
    }
  }, [currentExercise.id, currentSet, exerciseIdx, adjustedLb, useKg])

  // The RestTimer is a passive countdown shown at the bottom — not a real
  // modal — so we keep swipe enabled during rest. Only true overlays
  // (sheets, dialogs, chat) block navigation.
  const overlayOpen = actionsOpen || infoOpen || difficultyOpen || chatOpen

  /**
   * Step forward by one set. If we're on the last set of the current exercise,
   * jump to the next exercise (set 1). No-op if we're already on the last set
   * of the last exercise.
   */
  const stepNext = useCallback(() => {
    if (overlayOpen) return
    setShowRest(false)
    setPlankSide("first")
    if (currentSet < currentExercise.sets) {
      setCurrentSet((s) => s + 1)
    } else if (exerciseIdx < exercises.length - 1) {
      setExerciseIdx((i) => i + 1)
      setCurrentSet(1)
    }
  }, [
    currentExercise.sets,
    currentSet,
    exerciseIdx,
    exercises.length,
    overlayOpen,
  ])

  /**
   * Step backward by one set. If we're on set 1, jump to the previous exercise
   * (last set). No-op if already on set 1 of the first exercise.
   */
  const stepPrev = useCallback(() => {
    if (overlayOpen) return
    setShowRest(false)
    setPlankSide("first")
    if (currentSet > 1) {
      setCurrentSet((s) => s - 1)
    } else if (exerciseIdx > 0) {
      const prevIdx = exerciseIdx - 1
      setExerciseIdx(prevIdx)
      setCurrentSet(exercises[prevIdx].sets)
    }
  }, [currentSet, exerciseIdx, exercises, overlayOpen])

  // Compute peek snapshots for the SwipeStack so the user gets a hint of what's
  // on either side while they're dragging. Returns null at boundaries.
  const prevPeek = useMemo<Peek | null>(() => {
    if (currentSet > 1) {
      const ex = currentExercise
      return {
        exercise: ex,
        set: currentSet - 1,
        kind: "set",
        done: completedSetsForCurrent.has(currentSet - 1),
      }
    }
    if (exerciseIdx > 0) {
      const prev = exercises[exerciseIdx - 1]
      const prevDone = completedSetsMap[prev.id] ?? new Set<number>()
      return {
        exercise: prev,
        set: prev.sets,
        kind: "exercise",
        done: prevDone.has(prev.sets),
      }
    }
    return null
  }, [
    completedSetsForCurrent,
    completedSetsMap,
    currentExercise,
    currentSet,
    exerciseIdx,
    exercises,
  ])

  const nextPeek = useMemo<Peek | null>(() => {
    if (currentSet < currentExercise.sets) {
      return {
        exercise: currentExercise,
        set: currentSet + 1,
        kind: "set",
        done: completedSetsForCurrent.has(currentSet + 1),
      }
    }
    if (exerciseIdx < exercises.length - 1) {
      const next = exercises[exerciseIdx + 1]
      const nextDone = completedSetsMap[next.id] ?? new Set<number>()
      return {
        exercise: next,
        set: 1,
        kind: "exercise",
        done: nextDone.has(1),
      }
    }
    return null
  }, [
    completedSetsForCurrent,
    completedSetsMap,
    currentExercise,
    currentSet,
    exerciseIdx,
    exercises,
  ])

  const swipeKey = `${exerciseIdx}-${currentSet}-${plankSide}`

  const handleDismissRest = useCallback(() => {
    setShowRest(false)
  }, [])

  const maybePromptDifficulty = useCallback((ex: WorkoutExercise) => {
    if (!isLoadBearing(ex)) return
    if (Math.random() > 0.25) return
    setDifficultyOpen(true)
  }, [])

  const completeSetAndAdvance = useCallback(() => {
    const newMap = { ...completedSetsMap }
    const existing = new Set(newMap[currentExercise.id] ?? new Set<number>())
    existing.add(currentSet)
    newMap[currentExercise.id] = existing
    setCompletedSetsMap(newMap)

    const allSetsNowDone = existing.size >= currentExercise.sets

    if (allSetsNowDone) {
      if (exerciseIdx < exercises.length - 1) {
        setShowRest(true)
        setRestSeconds(currentExercise.restSeconds)
        setExerciseIdx((i) => i + 1)
        setCurrentSet(1)
      } else {
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        const totalSetsAllDone = Object.values(newMap).reduce((acc, s) => acc + s.size, 0)
        const pct = Math.round((totalSetsAllDone / totalSets) * 100)
        onFinish(elapsed, pct)
      }
    } else {
      setShowRest(true)
      setRestSeconds(currentExercise.restSeconds)
      setCurrentSet((s) => Math.min(s + 1, currentExercise.sets))
    }
  }, [
    completedSetsMap,
    currentExercise,
    exerciseIdx,
    exercises.length,
    onFinish,
    startTime,
    totalSets,
    currentSet,
  ])

  const handleDone = useCallback(() => {
    const lbs = parseFloat(actualLbs)
    if (!Number.isNaN(lbs) && lbs > 0) {
      appendSessionSetLog({
        exerciseKey: canonical,
        setIndex: currentSet,
        lbs: useKg ? kgToLb(lbs) : lbs,
        at: new Date().toISOString(),
      })
    }
    maybePromptDifficulty(currentExercise)
    completeSetAndAdvance()
  }, [actualLbs, canonical, currentExercise, currentSet, maybePromptDifficulty, completeSetAndAdvance, useKg])

  const handleTimeFinished = useCallback(() => {
    if (secChaque && plankSide === "first") {
      setPlankSide("second")
      return
    }
    setPlankSide("first")
    maybePromptDifficulty(currentExercise)
    completeSetAndAdvance()
  }, [secChaque, plankSide, currentExercise, maybePromptDifficulty, completeSetAndAdvance])

  const handleUndo = () => {
    const newMap = { ...completedSetsMap }
    const existing = new Set(newMap[currentExercise.id] ?? new Set<number>())
    const lastSet = Math.max(...Array.from(existing))
    existing.delete(lastSet)
    newMap[currentExercise.id] = existing
    setCompletedSetsMap(newMap)
    setCurrentSet(lastSet)
    setShowRest(false)
    setPlankSide("first")
  }

  const handleFinish = () => {
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const pct = Math.round((totalSetsCompleted / totalSets) * 100)
    onFinish(elapsed, pct)
  }

  const suggestion = getSuggestion()
  const workTimerKey = `${currentExercise.id}-${currentSet}-${plankSide}`

  return (
    <div className="min-h-svh w-full bg-[var(--nike-bg)] text-white flex flex-col">
      {/* TOP BAR */}
      <div className="bg-[var(--nike-bg-elev)] border-b border-white/8">
        <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-3">
          <button
            type="button"
            onClick={handleFinish}
            className="text-[10px] font-extrabold tracking-[0.22em] text-white/55 uppercase hover:text-white transition-colors"
          >
            Finish
          </button>
          <span className="nk-eyebrow text-white/55">
            {session.type === "workout" ? "Workout" : "Primer"}
          </span>
          <button
            type="button"
            aria-label="Ask AI Coach"
            onClick={() => setChatOpen(true)}
            className="nk-icon-btn"
          >
            <MessageCircle className="size-4" />
          </button>
        </div>

        {/* Progress bars per exercise */}
        <div className="flex gap-1 px-5 pb-4">
          {Array.from({ length: exercises.length }).map((_, i) => {
            const ex = exercises[i]
            const done = (completedSetsMap[ex.id]?.size ?? 0) >= ex.sets
            const active = i === exerciseIdx
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all duration-300",
                  done
                    ? "bg-white"
                    : active
                      ? "bg-white/55"
                      : "bg-white/12",
                )}
                style={
                  done || active
                    ? { boxShadow: "0 0 8px rgba(255,255,255,0.25)" }
                    : undefined
                }
              />
            )
          })}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col flex-1">
        <SwipeStack
          itemKey={swipeKey}
          enabled={!overlayOpen}
          onSwipePrev={stepPrev}
          onSwipeNext={stepNext}
          renderPrev={() => (prevPeek ? <PeekCard peek={prevPeek} side="prev" /> : null)}
          renderNext={() => (nextPeek ? <PeekCard peek={nextPeek} side="next" /> : null)}
          renderCurrent={() => (
            <div className="relative">
              <div
                className={cn(
                  "transition-all duration-300",
                  isCurrentSetDone && "opacity-55 blur-[2px]",
                )}
              >
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="nk-eyebrow text-white/40 flex items-center gap-1.5">
                      {session.type === "workout" ? (
                        <>
                          <Zap className="size-3" />
                          Group {currentExercise.group}
                        </>
                      ) : (
                        <>
                          <Target className="size-3" />
                          Primer
                        </>
                      )}
                    </span>
                    <span className="nk-eyebrow text-white/30 nk-num">
                      {exerciseIdx + 1} / {exercises.length}
                    </span>
                  </div>
                  <h1 className="nk-h-display line-clamp-3">{currentExercise.name}</h1>
                  {secChaque && plankSide === "second" && (
                    <p className="nk-eyebrow text-emerald-400 mt-3">Other Side</p>
                  )}
                  <div className="mt-4">
                    <SetIndicator
                      currentSet={currentSet}
                      totalSets={currentExercise.sets}
                      completedSets={completedSetsForCurrent}
                    />
                  </div>
                </div>

                {currentExercise.demoVideoUrl ? (
                  <div className="px-4 space-y-2">
                    <ExerciseDemoVideo
                      videoUrl={currentExercise.demoVideoUrl}
                      title={currentExercise.name}
                      compact
                    />
                    {!isCurrentExerciseDone && (
                      <p className="text-[11px] text-center text-white/40 px-4">
                        Match the movement before you start the set.
                      </p>
                    )}
                  </div>
                ) : (
                  <ExerciseVisual
                    exercise={currentExercise}
                    isDone={isCurrentExerciseDone}
                  />
                )}

                {timeBased && !isCurrentExerciseDone && (
                  <ExerciseWorkTimer
                    resetKey={workTimerKey}
                    initialSeconds={workSeconds}
                    label={secChaque ? (plankSide === "first" ? "SIDE A" : "SIDE B") : "WORK"}
                    onFinished={handleTimeFinished}
                    onEarlyFinish={() => {
                      setPlankSide("first")
                      maybePromptDifficulty(currentExercise)
                      completeSetAndAdvance()
                    }}
                  />
                )}
              </div>

              {/* DONE badge — visible when this set was already completed (user
                  swiped back to review). Sits above the blurred content so it
                  stays sharp. */}
              {isCurrentSetDone && (
                <div className="absolute inset-0 flex items-start justify-center pointer-events-none pt-32">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.18)]">
                    <Check className="size-3.5" strokeWidth={3} />
                    <span className="text-[10px] font-black tracking-[0.22em] uppercase">
                      Done
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        />

        <div className="px-5 space-y-3 pb-3">
          {/* Weight × Reps stat tiles */}
          <div className="flex gap-2 items-stretch">
            <div className="nk-stat flex-1">
              <span className="nk-stat-label">
                {currentExercise.weightUnit || "Load"}
              </span>
              <span className="nk-stat-value nk-num">
                {currentExercise.weight}
              </span>
            </div>
            <div className="flex items-center justify-center w-8 shrink-0">
              <span className="text-xl font-black text-white/30">×</span>
            </div>
            <div className="nk-stat flex-1">
              <span className="nk-stat-label">
                {currentExercise.repsLabel}
              </span>
              <span className="nk-stat-value nk-num">
                {currentExercise.reps}
              </span>
            </div>
          </div>

          {/* % range hint */}
          {lbRangeText && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5">
              <span className="nk-eyebrow text-white/40">Suggested Load</span>
              <p className="text-sm font-extrabold nk-num mt-0.5">
                {lbRangeText}
              </p>
            </div>
          )}

          {showLoadUi && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="nk-eyebrow text-white/40">Actual Weight</span>
                {freshnessCoef < 1 && defaultLb != null && (
                  <span className="nk-eyebrow text-amber-400 nk-num">
                    Freshness {Math.round((freshnessCoef - 1) * 100)}%
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={useKg ? "kg" : "lb"}
                  className="flex-1 rounded-lg bg-white/5 border-white/15 text-white placeholder:text-white/30 px-3 py-2.5 text-base font-extrabold nk-num h-auto"
                  value={actualLbs}
                  onChange={(e) => setActualLbs(e.target.value)}
                />
                <span className="text-xs font-extrabold text-white/45 uppercase tracking-widest w-8 text-center">
                  {useKg ? "kg" : "lb"}
                </span>
              </div>
              {suggestion?.key === baselineKey && (
                <p className="text-[11px] text-amber-300 leading-snug">
                  Next time: {suggestion.deltaLb > 0 ? "+" : ""}
                  {suggestion.deltaLb} lb — {suggestion.reason}
                </p>
              )}
            </div>
          )}

          <SetEffortFeedback
            exercise={currentExercise}
            currentSet={currentSet}
            resting={showRest}
          />

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="flex-1 h-auto flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 py-3.5 hover:bg-white/10 transition-colors text-white"
            >
              <Info className="size-5" />
              <span className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-white/55">
                Info
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              className="flex-1 h-auto flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 py-3.5 hover:bg-white/10 transition-colors text-white"
            >
              <Edit className="size-5" />
              <span className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-white/55">
                Actions
              </span>
            </button>
            {isCurrentExerciseDone ? (
              <button
                type="button"
                onClick={handleUndo}
                className="flex-1 h-auto flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 py-3.5 hover:bg-white/10 transition-colors"
              >
                <div className="size-5 rounded-full bg-white text-black flex items-center justify-center">
                  <Check className="size-3" strokeWidth={3} />
                </div>
                <span className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-white/55">
                  Undo
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDone}
                className="flex-1 h-auto flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white text-black py-3.5 hover:bg-white/90 transition-colors"
                style={{ boxShadow: "0 8px 24px rgba(255,255,255,0.12)" }}
              >
                <div className="size-5 rounded-full border-2 border-black flex items-center justify-center">
                  <div className="size-2 rounded-full bg-black" />
                </div>
                <span className="text-[9px] font-black tracking-[0.22em] uppercase">
                  {timeBased ? "Skip" : "Done"}
                </span>
              </button>
            )}
          </div>
        </div>

        {nextExercise && !showRest && (
          <div className="mx-5 mb-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <span className="nk-eyebrow text-white/40 mr-2">Next</span>
            <span className="text-sm font-extrabold text-white">
              {nextExercise.name}
            </span>
            <span className="text-xs text-white/45 nk-num">
              {" "}
              × {nextExercise.reps}
            </span>
          </div>
        )}

        {showRest && (
          <div className="mb-3">
            <RestTimer seconds={restSeconds} onDismiss={handleDismissRest} />
          </div>
        )}

        <div className="px-5 mb-4 mt-auto">
          <HRMWidget trackingExercise={currentExercise} />
        </div>
      </div>

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85vh] overflow-y-auto bg-[#141414] border-white/10 text-white"
        >
          <SheetHeader>
            <SheetTitle className="text-2xl font-black tracking-tight uppercase text-white">
              Lift Baselines
            </SheetTitle>
            <SheetDescription className="text-white/55">
              1RM values drive % prescriptions. Toggle kg if you prefer.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <Label
                htmlFor="kg-toggle"
                className="text-sm font-extrabold text-white"
              >
                Use Kilograms
              </Label>
              <Switch
                id="kg-toggle"
                checked={useKg}
                onCheckedChange={(v) => {
                  setUseKg(v)
                  setUseKgState(v)
                }}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <Label
                htmlFor="both-plank"
                className="text-sm font-extrabold text-white pr-3"
              >
                Plank Both Sides
              </Label>
              <Switch
                id="both-plank"
                checked={bothSides}
                onCheckedChange={(v) => {
                  setBothSidesState(v)
                  setBothSidesPlank(v)
                }}
              />
            </div>

            <div className="space-y-3 pt-3">
              <p className="nk-eyebrow text-white/40">1RM Baselines</p>
              {["back_squat", "db_bench", "rdl"].map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label className="nk-eyebrow text-white/55 capitalize">
                    {k.replace(/_/g, " ")}
                  </Label>
                  <Input
                    type="number"
                    className="w-full rounded-lg bg-white/5 border-white/15 text-white placeholder:text-white/30 px-3 py-2.5 text-base font-extrabold nk-num h-auto"
                    placeholder={useKg ? "kg" : "lb"}
                    value={
                      baselineInputs[k] ??
                      (baselines[k]
                        ? String(
                            useKg ? lbToKg(baselines[k]) : Math.round(baselines[k]),
                          )
                        : "")
                    }
                    onChange={(e) =>
                      setBaselineInputs((prev) => ({
                        ...prev,
                        [k]: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      const raw = parseFloat(baselineInputs[k] || "")
                      if (!Number.isNaN(raw) && raw > 0) {
                        const lb = useKg ? kgToLb(raw) : raw
                        setLiftBaseline(k, lb)
                        setBaselines(getLiftBaselines())
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActionsOpen(false)}
            className="nk-cta"
          >
            Close
          </button>
        </SheetContent>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[90vh] overflow-y-auto bg-[#141414] border-white/10 text-white"
        >
          <SheetHeader>
            <SheetTitle className="text-2xl font-black tracking-tight uppercase text-white text-left pr-8 line-clamp-3">
              {currentExercise.name}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Exercise demo and coaching notes
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 py-4">
            {currentExercise.demoVideoUrl ? (
              <ExerciseDemoVideo
                videoUrl={currentExercise.demoVideoUrl}
                title={currentExercise.name}
              />
            ) : (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="nk-eyebrow text-white/40 mb-2">No Demo Yet</p>
                <p className="text-xs text-white/55 leading-relaxed">
                  Add an MP4 under{" "}
                  <code className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                    public/exercise-demos/
                  </code>{" "}
                  and map the template id in{" "}
                  <code className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                    exerciseDemoVideos.ts
                  </code>
                  .
                </p>
              </div>
            )}
            {currentExercise.notes && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="nk-eyebrow text-white/40 mb-2">Notes</p>
                <p className="text-sm text-white/85 leading-relaxed whitespace-pre-line">
                  {currentExercise.notes}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setInfoOpen(false)}
            className="nk-cta"
          >
            Close
          </button>
        </SheetContent>
      </Sheet>

      <Dialog open={difficultyOpen} onOpenChange={setDifficultyOpen}>
        <DialogContent className="sm:max-w-sm bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight uppercase">
              How Did That Set Feel?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2 mt-2">
            <button
              type="button"
              className="nk-cta-ghost"
              onClick={() => {
                setSuggestion(baselineKey, 5, "Felt easy — try a small bump.")
                setDifficultyOpen(false)
              }}
            >
              Too Easy
            </button>
            <button
              type="button"
              className="nk-cta"
              onClick={() => setDifficultyOpen(false)}
            >
              Just Right
            </button>
            <button
              type="button"
              className="nk-cta-ghost"
              onClick={() => {
                setSuggestion(
                  baselineKey,
                  -5,
                  "Felt heavy — hold or reduce load.",
                )
                setDifficultyOpen(false)
              }}
            >
              Too Hard
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {chatOpen && (
        <Suspense fallback={null}>
          <AIChatPanel
            open={chatOpen}
            onOpenChange={setChatOpen}
            context={`Active workout — Session: ${session.name}\nCurrent exercise: ${currentExercise.name}\nSet: ${currentSet}/${currentExercise.sets}\nWeight: ${currentExercise.weight} ${currentExercise.weightUnit ?? ""}\nReps: ${currentExercise.reps} ${currentExercise.repsLabel}\nWeek: ${currentWeek}`}
          />
        </Suspense>
      )}
    </div>
  )
}
