import { useState, useEffect, useCallback, useRef } from "react"
import { Play, Pause, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  playPrepTick,
  playWorkIntervalComplete,
  playWorkStartChime,
  unlockWorkoutAudio,
} from "@/lib/workoutSounds"

const PREP_SECONDS = 5

interface ExerciseWorkTimerProps {
  /** Reset timer when this changes (e.g. exercise id + set + side). */
  resetKey: string
  initialSeconds: number
  label?: string
  onFinished: () => void
  onEarlyFinish: () => void
}

export function ExerciseWorkTimer({
  resetKey,
  initialSeconds,
  label = "WORK",
  onFinished,
  onEarlyFinish,
}: ExerciseWorkTimerProps) {
  const [phase, setPhase] = useState<"idle" | "prep" | "running" | "paused">("idle")
  const [prepRemaining, setPrepRemaining] = useState(PREP_SECONDS)
  const [duration, setDuration] = useState(initialSeconds)
  const [remaining, setRemaining] = useState(initialSeconds)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState(String(initialSeconds))
  const finishedRef = useRef(false)
  const prepGoFiredRef = useRef(false)

  useEffect(() => {
    setDuration(initialSeconds)
    setRemaining(initialSeconds)
    setEditValue(String(initialSeconds))
    setPhase("idle")
    setPrepRemaining(PREP_SECONDS)
    finishedRef.current = false
    prepGoFiredRef.current = false
  }, [resetKey, initialSeconds])

  /** Prep countdown: 5 → 4 → … → 1 → 0, then chime + work starts */
  useEffect(() => {
    if (phase !== "prep" || prepRemaining <= 0) return
    const id = setTimeout(() => {
      setPrepRemaining((p) => {
        if (p <= 1) return 0
        void playPrepTick()
        return p - 1
      })
    }, 1000)
    return () => clearTimeout(id)
  }, [phase, prepRemaining])

  useEffect(() => {
    if (phase !== "prep" || prepRemaining !== 0 || prepGoFiredRef.current) return
    prepGoFiredRef.current = true
    void playWorkStartChime().then(() => {
      setPhase("running")
      setRemaining(duration)
      finishedRef.current = false
    })
  }, [phase, prepRemaining, duration])

  useEffect(() => {
    if (phase !== "running" || remaining <= 0) return
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [phase, remaining])

  useEffect(() => {
    if (phase !== "running" || remaining > 0 || finishedRef.current) return
    finishedRef.current = true
    setPhase("idle")
    void playWorkIntervalComplete()
    try {
      navigator.vibrate?.(200)
    } catch {
      /* ignore */
    }
    onFinished()
  }, [phase, remaining, onFinished])

  const start = useCallback(() => {
    void unlockWorkoutAudio()
    prepGoFiredRef.current = false
    if (remaining <= 0) setRemaining(duration)
    setPrepRemaining(PREP_SECONDS)
    setPhase("prep")
  }, [duration, remaining])

  const skipPrep = useCallback(() => {
    prepGoFiredRef.current = true
    void playWorkStartChime()
    setPhase("running")
    setRemaining(duration)
    finishedRef.current = false
  }, [duration])

  const cancelPrep = useCallback(() => {
    setPhase("idle")
    setPrepRemaining(PREP_SECONDS)
    prepGoFiredRef.current = false
  }, [])

  const pause = useCallback(() => setPhase("paused"), [])
  const resume = useCallback(() => setPhase("running"), [])

  const add15 = useCallback(() => {
    setRemaining((r) => r + 15)
    setDuration((d) => d + 15)
  }, [])

  const applyEdit = useCallback(() => {
    const n = parseInt(editValue, 10)
    if (!Number.isNaN(n) && n > 0) {
      setDuration(n)
      setRemaining(n)
      setEditOpen(false)
    }
  }, [editValue])

  const isPrep = phase === "prep"
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0")
  const ss = String(remaining % 60).padStart(2, "0")
  const progress = isPrep
    ? Math.max(0, prepRemaining) / PREP_SECONDS
    : duration > 0
      ? remaining / duration
      : 0

  return (
    <div className="mx-4 mb-3 space-y-2">
      <div
        className={cn(
          "relative h-14 rounded-2xl overflow-hidden border bg-zinc-900",
          isPrep ? "border-amber-500/50" : "border-emerald-500/40",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 transition-all duration-1000",
            isPrep ? "bg-gradient-to-r from-amber-600 to-orange-500" : "bg-gradient-to-r from-emerald-600 to-teal-500",
          )}
          style={{
            clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span className="font-black text-sm tracking-widest text-white drop-shadow-sm">
            {isPrep ? (
              <>
                GET READY <span className="tabular-nums">{prepRemaining > 0 ? prepRemaining : "…"}</span>
              </>
            ) : (
              <>
                {label} {mm}:{ss}
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            {phase === "idle" && remaining > 0 && (
              <button
                type="button"
                onClick={() => setEditOpen((v) => !v)}
                className="text-[10px] font-bold uppercase text-white/90 px-2 py-1 rounded-lg bg-white/15"
              >
                Edit
              </button>
            )}
            {isPrep ? (
              <button
                type="button"
                onClick={skipPrep}
                className="text-[10px] font-bold uppercase text-white/90 px-2 py-1 rounded-lg bg-white/20"
              >
                Skip
              </button>
            ) : phase === "running" ? (
              <button
                type="button"
                onClick={pause}
                className="size-9 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Pause className="size-4 text-white" />
              </button>
            ) : phase === "paused" ? (
              <button
                type="button"
                onClick={resume}
                className="size-9 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Play className="size-4 text-white pl-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                className="size-9 rounded-full bg-white/25 flex items-center justify-center"
              >
                <Play className="size-4 text-white pl-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isPrep && (
        <p className="text-[11px] text-center text-muted-foreground px-2">
          {PREP_SECONDS}s to get into position — then the work timer starts.
        </p>
      )}

      {editOpen && phase === "idle" && (
        <div className="flex gap-2 items-center px-1">
          <input
            type="number"
            min={5}
            max={7200}
            className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm tabular-nums"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">sec</span>
          <button type="button" onClick={applyEdit} className="text-xs font-bold text-emerald-600 px-2">
            Apply
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={add15}
          disabled={isPrep}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-muted/80 py-2.5 text-xs font-bold uppercase tracking-wide disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          15s
        </button>
        {isPrep ? (
          <button
            type="button"
            onClick={cancelPrep}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-300"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onEarlyFinish}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-300"
          >
            <Check className="size-3.5" />
            Done early
          </button>
        )}
      </div>
    </div>
  )
}
