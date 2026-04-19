import { AlertTriangle, ShieldAlert, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompletedSession } from "@/lib/workoutData"
import { getFreshnessLog } from "@/lib/freshness"
import {
  assessInjuryRisk,
  injuryRiskLevelColor,
  type InjuryRiskLevel,
} from "@/lib/injuryRisk"

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

interface InjuryRiskCardProps {
  completedSessions: CompletedSession[]
  className?: string
}

export function InjuryRiskCard({
  completedSessions,
  className,
}: InjuryRiskCardProps) {
  const log = getFreshnessLog()
  const entryToday = log.find((e) => e.date === todayKey()) ?? null

  const assessment = assessInjuryRisk({
    completedSessions,
    todaysSubjective: entryToday,
  })

  const color = injuryRiskLevelColor(assessment.level)
  const showUrgent =
    assessment.level === "high" || assessment.level === "critical"

  return (
    <div
      className={cn(
        "nk-card p-5 space-y-5",
        showUrgent && "border-red-500/40",
        className,
      )}
    >
      {/* Demo notice */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
        <p className="nk-eyebrow text-amber-300 mb-1.5">Demo Mode</p>
        <p className="text-[11px] text-amber-100/85 leading-relaxed">
          Full predictive analysis runs only with your{" "}
          <strong className="text-amber-50">Helio Strap connected</strong>.
          Without it, values are simulated from local data (workouts, morning
          form).
        </p>
      </div>

      {/* Title + score */}
      <div className="flex items-start gap-4">
        <div
          className="size-12 rounded-2xl flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: color + "1f",
            borderColor: color + "55",
          }}
        >
          {showUrgent ? (
            <ShieldAlert className="size-5" style={{ color }} />
          ) : (
            <Activity className="size-5" style={{ color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="nk-eyebrow text-white/40">Risk Assessment</p>
          <p className="text-base font-black tracking-tight uppercase mt-1 leading-tight">
            {assessment.title}
          </p>
          <p className="text-[11px] text-white/45 mt-1.5 leading-snug">
            7-day load · sleep · asymmetry · fatigue
          </p>
        </div>
        <div className="text-right shrink-0">
          <span
            className="text-4xl font-black nk-num tracking-tighter leading-none"
            style={{ color }}
            title="Risk score (0 = low, 100 = high)"
          >
            {assessment.riskScore}
          </span>
          <p className="nk-eyebrow text-white/35 mt-1">/ 100</p>
        </div>
      </div>

      <p className="text-sm text-white/85 leading-relaxed">
        {assessment.summary}
      </p>

      {/* Factors */}
      <div className="space-y-3">
        <p className="nk-eyebrow text-white/40">Strain Factors</p>
        <div className="space-y-3">
          <FactorBar
            label="Load"
            value={assessment.factors.loadStrain}
            tone={assessment.level}
          />
          <FactorBar
            label="Sleep"
            value={assessment.factors.sleepStrain}
            tone={assessment.level}
          />
          <FactorBar
            label="Asymmetry"
            value={assessment.factors.asymmetryStrain}
            tone={assessment.level}
          />
          <FactorBar
            label="Fatigue"
            value={assessment.factors.fatigueStrain}
            tone={assessment.level}
          />
        </div>
      </div>

      {assessment.factors.acuteChronicRatio != null && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <p className="nk-eyebrow text-white/40">Acute / Chronic Ratio</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black nk-num">
              {assessment.factors.acuteChronicRatio.toFixed(2)}
            </span>
            <span className="text-[10px] text-white/45 font-bold tracking-widest uppercase">
              · target 0.8 — 1.3
            </span>
          </div>
        </div>
      )}

      {showUrgent && (
        <div className="flex gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-400" />
          <span className="text-xs text-red-200 leading-relaxed">
            Prioritize sleep, hydration and light sessions. Avoid intensity
            spikes until the score drops.
          </span>
        </div>
      )}

      {/* Recommendations */}
      {assessment.recommendations.length > 0 && (
        <div className="space-y-2">
          <p className="nk-eyebrow text-white/40">Recommendations</p>
          <ul className="space-y-2">
            {assessment.recommendations.map((r, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs text-white/75 leading-relaxed"
              >
                <span className="text-white/30 shrink-0 mt-0.5">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-white/35 leading-snug">
        Demo only — with the Helio Strap connected, physiological signals (HRV,
        etc.) feed a more reliable estimate. Not medical advice.
      </p>
    </div>
  )
}

function FactorBar({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: InjuryRiskLevel
}) {
  const warm = tone === "high" || tone === "critical"
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="nk-eyebrow text-white/55">{label}</span>
        <span className="text-xs font-black nk-num text-white">
          {Math.round(value)}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          className={cn(
            "h-full transition-all rounded-full",
            warm ? "bg-red-400" : "bg-white",
          )}
          style={{
            width: `${Math.min(100, value)}%`,
            boxShadow: warm
              ? "0 0 10px rgba(248,113,113,0.5)"
              : "0 0 10px rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  )
}
