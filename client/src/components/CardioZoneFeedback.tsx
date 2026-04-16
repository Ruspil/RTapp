import type { WorkoutExercise } from "@/lib/workoutData"
import type { HRSample } from "@/lib/heartRateUtils"
import {
  feedbackCopy,
  fractionTimeInTarget,
  getTargetZonesForExercise,
  type ZoneSeconds,
} from "@/lib/zoneTargets"
import { getCardioHistoryForExercise } from "@/lib/liftStorage"
import { canonicalExerciseId } from "@/lib/exerciseLoad"
import { calculateAverageBPM } from "@/lib/heartRateUtils"

interface CardioZoneFeedbackProps {
  exercise: WorkoutExercise
  zoneSeconds: ZoneSeconds
  sessionActive: boolean
  sessionSamples: HRSample[]
}

export function CardioZoneFeedback({
  exercise,
  zoneSeconds,
  sessionActive,
  sessionSamples,
}: CardioZoneFeedbackProps) {
  const target = getTargetZonesForExercise(exercise)
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
    if (last.pctInTarget > prev.pctInTarget + 0.05) trend = "More time in target zones vs last time."
    else if (last.avgBpm < prev.avgBpm - 3 && last.pctInTarget >= prev.pctInTarget - 0.05)
      trend = "Similar zone quality with lower average HR — good control."
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Zone check</p>
      <p className="text-xs text-zinc-200">
        Target: Z{target.minZ}
        {target.minZ !== target.maxZ ? `–Z${target.maxZ}` : ""} · {pctDisplay}% of session in band
        {avg > 0 ? ` · avg ${avg} BPM` : ""}
      </p>
      <p className="text-xs text-emerald-400/90">{feedbackCopy(pct, target)}</p>
      {trend && <p className="text-[11px] text-zinc-400">{trend}</p>}
      <p className="text-[10px] text-zinc-600">Not medical advice — tune max HR in profile if needed.</p>
    </div>
  )
}
