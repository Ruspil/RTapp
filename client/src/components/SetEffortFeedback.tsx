import { useEffect, useRef, useState } from "react"
import { Activity, ArrowDown, Heart, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkoutExercise } from "@/lib/workoutData"
import { useHelioStrap } from "@/lib/helioStrap"
import { HR_ZONES } from "@/lib/heartRateUtils"
import { canonicalExerciseId, isLoadBearing } from "@/lib/exerciseLoad"
import { isTimeBasedExercise } from "@/lib/exerciseTimer"

/**
 * Between-set effort coach for strength work:
 *  - During the set → show live BPM + peak BPM captured so far (helps judge effort).
 *  - During rest → capture drop from peak to HR at ~60s into rest. Verdict:
 *      drop ≥ 25 bpm → Good recovery (push next set)
 *      10–24         → Normal
 *      < 10          → Still fatigued (add rest / reduce load)
 *
 * Only rendered when Helio Strap is actually connected and the exercise is
 * strength-like (load-bearing and not time-based).
 */
interface SetEffortFeedbackProps {
  exercise: WorkoutExercise
  currentSet: number
  resting: boolean
}

type Verdict = "good" | "normal" | "fatigued"

const GYM_CANONICAL_IDS = new Set([
  "back-squat",
  "rdl",
  "db-bench",
  "lat-pulldown",
  "seated-cable-row",
  "lateral-lunge",
  "kb-swings",
  "mb-slams",
  "bulgarian-squats",
])

export function SetEffortFeedback({ exercise, currentSet, resting }: SetEffortFeedbackProps) {
  const helio = useHelioStrap()
  const canonical = canonicalExerciseId(exercise.id)

  const [peakBpm, setPeakBpm] = useState<number | null>(null)
  const [restStartTs, setRestStartTs] = useState<number | null>(null)
  const [restHrAt60, setRestHrAt60] = useState<number | null>(null)
  const prevRestingRef = useRef(resting)
  const prevExerciseKeyRef = useRef(`${exercise.id}:${currentSet}`)

  // Reset peak when exercise or set changes.
  useEffect(() => {
    const key = `${exercise.id}:${currentSet}`
    if (key !== prevExerciseKeyRef.current) {
      prevExerciseKeyRef.current = key
      setPeakBpm(null)
      setRestStartTs(null)
      setRestHrAt60(null)
    }
  }, [exercise.id, currentSet])

  // Track peak BPM whenever a fresh value arrives.
  useEffect(() => {
    if (helio.currentBPM == null) return
    if (resting) return
    setPeakBpm((prev) => (prev == null || helio.currentBPM! > prev ? helio.currentBPM : prev))
  }, [helio.currentBPM, resting])

  // On rest transition, record start and kick off a 60s capture.
  useEffect(() => {
    if (resting && !prevRestingRef.current) {
      setRestStartTs(Date.now())
      setRestHrAt60(null)
    }
    if (!resting && prevRestingRef.current) {
      setRestStartTs(null)
    }
    prevRestingRef.current = resting
  }, [resting])

  useEffect(() => {
    if (!resting || !restStartTs) return
    const t = setInterval(() => {
      const elapsed = Date.now() - restStartTs
      if (elapsed >= 60_000 && helio.currentBPM != null && restHrAt60 == null) {
        setRestHrAt60(helio.currentBPM)
      }
    }, 500)
    return () => clearInterval(t)
  }, [resting, restStartTs, helio.currentBPM, restHrAt60])

  // Don't render unless strap is connected and exercise is a strength lift.
  if (!helio.isConnected) return null
  if (isTimeBasedExercise(exercise)) return null
  if (!isLoadBearing(exercise) && !GYM_CANONICAL_IDS.has(canonical)) return null

  const zoneInfo = helio.currentZone ? HR_ZONES[helio.currentZone as keyof typeof HR_ZONES] : null
  const peakZoneInfo = peakBpm
    ? (() => {
        // Recompute zone for peak using same maxHR via ratio (approx): use zones by % maxHR
        // but we don't have maxHR here. helio zone uses stored maxHR. We'll skip showing zone for peak in this minimal view.
        return null
      })()
    : null
  void peakZoneInfo

  const drop = peakBpm != null && restHrAt60 != null ? peakBpm - restHrAt60 : null
  const verdict: Verdict | null =
    drop == null ? null : drop >= 25 ? "good" : drop >= 10 ? "normal" : "fatigued"

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
          <Activity className="size-3" />
          Effort check
        </p>
        {helio.currentBPM != null && (
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: zoneInfo?.color ?? "#d4d4d8" }}
          >
            {helio.currentBPM} BPM {helio.currentZone ? `· Z${helio.currentZone}` : ""}
          </span>
        )}
      </div>

      {!resting && (
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <Heart className="size-3.5 text-red-400 fill-red-400" />
          <span>Peak série : <b className="tabular-nums">{peakBpm ?? "—"}</b> BPM</span>
        </div>
      )}

      {resting && peakBpm != null && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-200">
            <ArrowDown className="size-3.5 text-emerald-400" />
            <span>
              Rest:{" "}
              {restHrAt60 != null ? (
                <>
                  chute de{" "}
                  <b
                    className={cn(
                      "tabular-nums",
                      verdict === "good" && "text-emerald-400",
                      verdict === "normal" && "text-yellow-400",
                      verdict === "fatigued" && "text-orange-400",
                    )}
                  >
                    {drop} BPM
                  </b>{" "}
                  en 60s
                </>
              ) : (
                <>mesure en cours…</>
              )}
            </span>
          </div>
          {verdict && (
            <p
              className={cn(
                "text-[11px] font-semibold",
                verdict === "good" && "text-emerald-400",
                verdict === "normal" && "text-yellow-400",
                verdict === "fatigued" && "text-orange-400",
              )}
            >
              {verdict === "good" && "Bonne récup — tu peux pousser la prochaine série."}
              {verdict === "normal" && "Récup normale — maintiens la charge."}
              {verdict === "fatigued" && "Encore fatigué — prolonge le rest ou allège."}
            </p>
          )}
        </div>
      )}

      {/* Push-more nudge when peak is below Z3 on strength compounds. */}
      {!resting && peakBpm != null && helio.currentZone != null && helio.currentZone < 3 && (
        <p className="text-[11px] text-amber-400 flex items-center gap-1">
          <TrendingUp className="size-3" />
          Peu intense (Z{helio.currentZone}) — tu peux pousser un peu plus.
        </p>
      )}
    </div>
  )
}
