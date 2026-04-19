import { useEffect, useRef, useState } from "react"
import { ArrowDownCircle, ArrowUpCircle, Flame, Heart } from "lucide-react"
import type { WorkoutExercise } from "@/lib/workoutData"
import type { HRSample } from "@/lib/heartRateUtils"
import { HR_ZONES, calculateAverageBPM } from "@/lib/heartRateUtils"
import {
  feedbackCopy,
  fractionTimeInTarget,
  getTargetZonesForExercise,
  type ZoneTarget,
  type ZoneSeconds,
} from "@/lib/zoneTargets"
import { getCardioHistoryForExercise } from "@/lib/liftStorage"
import { canonicalExerciseId } from "@/lib/exerciseLoad"
import { useHelioStrap } from "@/lib/helioStrap"
import { playPrepTick, playWorkStartChime } from "@/lib/workoutSounds"
import { cn } from "@/lib/utils"

interface CardioZoneFeedbackProps {
  exercise: WorkoutExercise
  zoneSeconds: ZoneSeconds
  sessionActive: boolean
  sessionSamples: HRSample[]
}

type LiveState = "push" | "hold" | "backoff"

function targetBpmRange(target: ZoneTarget, maxHR: number): { min: number; max: number } {
  const zMin = HR_ZONES[target.minZ as keyof typeof HR_ZONES]
  const zMax = HR_ZONES[target.maxZ as keyof typeof HR_ZONES]
  return {
    min: Math.round(maxHR * zMin.min),
    max: Math.round(maxHR * zMax.max),
  }
}

export function CardioZoneFeedback({
  exercise,
  zoneSeconds,
  sessionActive,
  sessionSamples,
}: CardioZoneFeedbackProps) {
  const target = getTargetZonesForExercise(exercise)
  const helio = useHelioStrap()

  // Live state with hysteresis so it does not flip too often.
  const [liveState, setLiveState] = useState<LiveState | null>(null)
  const lastChangeTs = useRef<number>(0)

  const maxHR = (() => {
    const storedAge = typeof window !== "undefined" ? localStorage.getItem("userAge") : null
    const age = storedAge ? parseInt(storedAge) : null
    return age ? 220 - age : 190
  })()

  useEffect(() => {
    if (!target || !helio.isConnected || helio.currentBPM == null || !sessionActive) {
      setLiveState(null)
      return
    }
    const { min, max } = targetBpmRange(target, maxHR)
    const bpm = helio.currentBPM
    let next: LiveState
    if (bpm < min - 5) next = "push"
    else if (bpm > max + 5) next = "backoff"
    else next = "hold"

    // Hysteresis: change at most every 3 s.
    const now = Date.now()
    if (liveState !== next && now - lastChangeTs.current >= 3000) {
      lastChangeTs.current = now
      setLiveState(next)
      // Short audio cue when exiting the target band.
      if (next !== "hold") {
        try {
          if (next === "push") playWorkStartChime()
          else playPrepTick()
        } catch {
          /* ignore */
        }
      }
      // Vibration if supported.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(next === "hold" ? 40 : 80)
        } catch {
          /* ignore */
        }
      }
    } else if (liveState == null) {
      lastChangeTs.current = now
      setLiveState(next)
    }
  }, [helio.currentBPM, helio.isConnected, sessionActive, target, maxHR, liveState])

  if (!target || !sessionActive) return null

  const pct = fractionTimeInTarget(zoneSeconds, target)
  const pctDisplay = Math.round(pct * 100)
  const avg = sessionSamples.length ? calculateAverageBPM(sessionSamples) : 0

  const key = canonicalExerciseId(exercise.id)
  const past = getCardioHistoryForExercise(key, 4)
  let trend: string | null = null
  if (past.length >= 2) {
    const prev = past[past.length - 2]
    const last = past[past.length - 1]
    if (last.pctInTarget > prev.pctInTarget + 0.05) trend = "Plus de temps dans la cible vs la dernière fois."
    else if (last.avgBpm < prev.avgBpm - 3 && last.pctInTarget >= prev.pctInTarget - 0.05)
      trend = "Même qualité de zone avec HR moyenne plus basse — bon contrôle."
  }

  const { min: tgtMin, max: tgtMax } = targetBpmRange(target, maxHR)

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 space-y-2">
      {/* LIVE PILL */}
      {helio.isConnected && helio.currentBPM != null && liveState && (
        <div
          className={cn(
            "rounded-xl px-3 py-2 flex items-center gap-2",
            liveState === "push" && "bg-red-500/20 text-red-400 ring-1 ring-red-500/40 animate-pulse",
            liveState === "hold" && "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
            liveState === "backoff" && "bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/40",
          )}
        >
          {liveState === "push" && <ArrowUpCircle className="size-5" />}
          {liveState === "hold" && <Flame className="size-5" />}
          {liveState === "backoff" && <ArrowDownCircle className="size-5" />}
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-wider">
              {liveState === "push" && "Push harder"}
              {liveState === "hold" && "Hold pace"}
              {liveState === "backoff" && "Back off"}
            </p>
            <p className="text-[11px] opacity-80">
              {helio.currentBPM} BPM · cible {tgtMin}–{tgtMax}
            </p>
          </div>
          <Heart className="size-5 fill-current" />
        </div>
      )}

      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Zone check</p>
      <p className="text-xs text-zinc-200">
        Cible : Z{target.minZ}
        {target.minZ !== target.maxZ ? `–Z${target.maxZ}` : ""} · {pctDisplay}% du temps dans la bande
        {avg > 0 ? ` · moy. ${avg} BPM` : ""}
      </p>
      <p className="text-xs text-emerald-400/90">{feedbackCopy(pct, target)}</p>
      {trend && <p className="text-[11px] text-zinc-400">{trend}</p>}
      <p className="text-[10px] text-zinc-600">Pas un avis médical — ajuste la HR max dans ton profil si nécessaire.</p>
    </div>
  )
}
