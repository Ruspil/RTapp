import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
  MoveHorizontal as MoreHorizontal,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { playRestComplete } from "@/lib/workoutSounds"
import { Screen } from "@/components/app/Screen"
import { StatTile } from "@/components/app/StatTile"

interface ActiveWorkoutProps {
  session: Session
  day?: number
  onFinish: (durationSeconds: number, percentComplete: number) => void
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
    <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
      <div className={cn("transition-opacity duration-300", isDone ? "opacity-20" : "opacity-100")}>
        <div className="size-36 rounded-full bg-muted/60 flex items-center justify-center">
          <Icon className="size-16 text-muted-foreground" strokeWidth={1.2} />
        </div>
      </div>
      {isDone && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-20 rounded-full border-4 border-destructive flex items-center justify-center bg-background/60">
            <Check className="size-10 text-destructive" strokeWidth={3} />
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
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Set</span>
      {Array.from({ length: totalSets }).map((_, i) => {
        const setNum = i + 1
        const isActive = setNum === currentSet
        const isDone = completedSets.has(setNum)
        return (
          <div key={setNum} className="relative">
            <span
              className={cn(
                "text-base font-bold",
                isActive ? "text-destructive" : isDone ? "text-muted-foreground" : "text-foreground/60"
              )}
            >
              {setNum}
            </span>
            {isActive && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-destructive rounded-full" />}
          </div>
        )
      })}
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
    <div className="relative h-12 mx-4 rounded-full overflow-hidden">
      <div
        className="absolute inset-0 rounded-full transition-all duration-1000"
        style={{
          background: "linear-gradient(to right, #ef4444, #f97316)",
          clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
        }}
      />
      <div className="absolute inset-0 rounded-full bg-muted/80" style={{ zIndex: -1 }} />
      <div className="relative h-full flex items-center justify-between px-5">
        <span className="font-black text-sm tracking-widest text-white">
          REST {mm}:{ss}
        </span>
        <Button onClick={onDismiss} type="button" variant="ghost" size="icon-xs" className="size-6 rounded-full bg-white/20 hover:bg-white/25">
          <X className="size-3.5 text-white" />
        </Button>
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

  const currentExercise = exercises[exerciseIdx]
  const nextExercise = exerciseIdx < exercises.length - 1 ? exercises[exerciseIdx + 1] : null

  const completedSetsForCurrent = completedSetsMap[currentExercise.id] ?? new Set<number>()
  const isCurrentExerciseDone = completedSetsForCurrent.size >= currentExercise.sets

  const totalSetsCompleted = Object.values(completedSetsMap).reduce((acc, s) => acc + s.size, 0)
  const totalSets = exercises.reduce((acc, e) => acc + e.sets, 0)

  const timeBased = isTimeBasedExercise(currentExercise)
  const workSeconds = useMemo(() => parseWorkDurationSeconds(currentExercise), [currentExercise])
  const secChaque =
    /CHAQUE/i.test(currentExercise.repsLabel) && bothSides && timeBased

  const canonical = canonicalExerciseId(currentExercise.id)
  const baselineKey = baselineKeyForExercise(canonical)
  const loadKind = classifyLoad(currentExercise)
  const showLoadUi = isLoadBearing(currentExercise) && !timeBased

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
    setActualLbs("")
  }, [currentExercise.id, currentSet, exerciseIdx])

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
    <Screen className="bg-background flex flex-col">
      <div className="bg-zinc-900 text-white">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <Button onClick={handleFinish} type="button" variant="ghost" className="text-xs font-bold tracking-widest text-white/70 uppercase hover:bg-white/10 px-0">
            Finish
          </Button>
          <span className="font-black text-sm tracking-widest uppercase">
            {session.type === "workout" ? "Workout" : "Primer"}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" aria-label="More" variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
              <MoreHorizontal className="size-5 text-white/60" />
            </Button>
            <Button type="button" aria-label="Chat" variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
              <MessageCircle className="size-5 text-white/60" />
            </Button>
          </div>
        </div>

        <div className="flex gap-0.5 px-4 pb-4">
          {Array.from({ length: exercises.length }).map((_, i) => {
            const ex = exercises[i]
            const done = (completedSetsMap[ex.id]?.size ?? 0) >= ex.sets
            const active = i === exerciseIdx
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  done ? "bg-white" : active ? "bg-white/60" : "bg-white/20"
                )}
              />
            )
          })}
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-background">
        <div className="px-5 pt-4 pb-2">
          <h1 className="font-black text-2xl tracking-tight text-foreground leading-tight mb-2">
            {currentExercise.name}
          </h1>
          {secChaque && plankSide === "second" && (
            <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-wide">Other side</p>
          )}
          <div className="flex items-center justify-between">
            <SetIndicator
              currentSet={currentSet}
              totalSets={currentExercise.sets}
              completedSets={completedSetsForCurrent}
            />
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
              {session.type === "workout" ? (
                <>
                  <Zap className="size-3 text-sky-500 fill-sky-500" />
                  Group {currentExercise.group}
                </>
              ) : (
                <>
                  <Target className="size-3 text-destructive" />
                  Primer
                </>
              )}
            </span>
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
              <p className="text-[11px] text-center text-muted-foreground">Human demo — match the movement before you start the set.</p>
            )}
          </div>
        ) : (
          <ExerciseVisual exercise={currentExercise} isDone={isCurrentExerciseDone} />
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

        <div className="px-4 space-y-2 pb-2">
          <div className="flex gap-2 items-center">
            <StatTile
              label={currentExercise.weightUnit ?? "Weight"}
              value={
                <span
                  className={cn(
                    currentExercise.weightUnit === "POUNDS" ? "text-sky-500" : "text-foreground"
                  )}
                >
                  {currentExercise.weight}
                </span>
              }
              className="flex-1"
            />
            <div className="flex items-center justify-center size-8 shrink-0">
              <span className="text-lg font-bold text-muted-foreground">×</span>
            </div>
            <StatTile label={currentExercise.repsLabel} value={currentExercise.reps} className="flex-1" />
          </div>

          {showLoadUi && (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Actual weight (this set)
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={useKg ? "kg" : "lb"}
                  className="flex-1 rounded-lg bg-background border px-3 py-2 text-sm tabular-nums"
                  value={actualLbs}
                  onChange={(e) => setActualLbs(e.target.value)}
                />
                <span className="text-xs text-muted-foreground w-8">{useKg ? "kg" : "lb"}</span>
              </div>
              {suggestion?.key === baselineKey && (
                <p className="text-[11px] text-amber-600">
                  Suggested next time: {suggestion.deltaLb > 0 ? "+" : ""}
                  {suggestion.deltaLb} lb — {suggestion.reason}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInfoOpen(true)}
              className="flex-1 h-auto flex flex-col items-center gap-1.5 rounded-xl bg-muted/60 py-3.5 hover:bg-muted transition-colors"
            >
              <Info className="size-5 text-foreground" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Info</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActionsOpen(true)}
              className="flex-1 h-auto flex flex-col items-center gap-1.5 rounded-xl bg-muted/60 py-3.5 hover:bg-muted transition-colors"
            >
              <Edit className="size-5 text-foreground" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Actions</span>
            </Button>
            {isCurrentExerciseDone ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleUndo}
                className="flex-1 h-auto flex flex-col items-center gap-1.5 rounded-xl bg-muted/60 py-3.5 hover:bg-muted transition-colors"
              >
                <div className="size-5 rounded-full bg-destructive flex items-center justify-center">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-destructive">Undo</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleDone}
                className="flex-1 h-auto flex flex-col items-center gap-1.5 rounded-xl py-3.5 text-white"
                style={{ background: "linear-gradient(to right, #ef4444, #f97316)" }}
              >
                <div className="size-5 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="size-2 rounded-full bg-white" />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-white">
                  {timeBased ? "Skip timer" : "Done"}
                </span>
              </Button>
            )}
          </div>
        </div>

        {nextExercise && !showRest && (
          <div className="mx-4 mb-3 px-4 py-2.5 rounded-xl bg-muted/40">
            <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">Next </span>
            <span className="text-xs font-bold text-foreground">{nextExercise.name}</span>
            <span className="text-xs text-muted-foreground"> × {nextExercise.reps}</span>
          </div>
        )}

        {showRest && (
          <div className="mx-0 mb-3">
            <RestTimer seconds={restSeconds} onDismiss={handleDismissRest} />
          </div>
        )}

        <div className="px-4 mb-3 mt-auto">
          <HRMWidget trackingExercise={currentExercise} />
        </div>
      </div>

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lift baselines</SheetTitle>
            <SheetDescription>1RM values drive % prescriptions. Toggle kg if you prefer.</SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-between py-3">
            <Label htmlFor="kg-toggle">Use kilograms</Label>
            <Switch
              id="kg-toggle"
              checked={useKg}
              onCheckedChange={(v) => {
                setUseKg(v)
                setUseKgState(v)
              }}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-t">
            <Label htmlFor="both-plank">Plank: timer both sides (SEC CHAQUE)</Label>
            <Switch
              id="both-plank"
              checked={bothSides}
              onCheckedChange={(v) => {
                setBothSidesState(v)
                setBothSidesPlank(v)
              }}
            />
          </div>
          <div className="space-y-3 pt-2">
            {["back_squat", "db_bench", "rdl"].map((k) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs uppercase text-muted-foreground">{k.replace(/_/g, " ")}</Label>
                <Input
                  type="number"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder={useKg ? "kg (stored as lb)" : "lb"}
                  value={baselineInputs[k] ?? (baselines[k] ? String(useKg ? lbToKg(baselines[k]) : Math.round(baselines[k])) : "")}
                  onChange={(e) => setBaselineInputs((prev) => ({ ...prev, [k]: e.target.value }))}
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
          <Button className="w-full mt-4" variant="secondary" onClick={() => setActionsOpen(false)}>
            Close
          </Button>
        </SheetContent>
      </Sheet>

      <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left pr-8">{currentExercise.name}</SheetTitle>
            <SheetDescription className="sr-only">Exercise demo and coaching notes</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-2">
            {currentExercise.demoVideoUrl ? (
              <ExerciseDemoVideo videoUrl={currentExercise.demoVideoUrl} title={currentExercise.name} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No demo video for this exercise yet. Add an MP4 under{" "}
                <code className="text-xs bg-muted px-1 rounded">public/exercise-demos/</code> and map the template id
                in <code className="text-xs bg-muted px-1 rounded">exerciseDemoVideos.ts</code>.
              </p>
            )}
            {currentExercise.notes && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                <p className="text-sm leading-relaxed">{currentExercise.notes}</p>
              </div>
            )}
          </div>
          <Button className="w-full mt-4" variant="secondary" onClick={() => setInfoOpen(false)}>
            Close
          </Button>
        </SheetContent>
      </Sheet>

      <Dialog open={difficultyOpen} onOpenChange={setDifficultyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>How did that set feel?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuggestion(baselineKey, 5, "Felt easy — try a small bump.")
                setDifficultyOpen(false)
              }}
            >
              Too easy
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setDifficultyOpen(false)}
            >
              Just right
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSuggestion(baselineKey, -5, "Felt heavy — hold or reduce load.")
                setDifficultyOpen(false)
              }}
            >
              Too hard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  )
}
