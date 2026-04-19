import { useEffect, useMemo, useState } from "react"
import { Activity, Edit3, Sparkles, Zap } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  bandColor,
  getAutoAdjustEnabled,
  getFreshnessLog,
  getTodaysFreshness,
  setAutoAdjustEnabled,
  type FreshnessResult,
} from "@/lib/freshness"
import { getTodaysHrv, useHelioStrap } from "@/lib/helioStrap"
import { HelioStrapConnector } from "@/components/HelioStrapConnector"
import { FreshnessForm } from "@/components/FreshnessForm"

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FreshnessCard() {
  const helio = useHelioStrap()
  const [formOpen, setFormOpen] = useState(false)
  const [, forceReload] = useState(0)
  const [autoAdjust, setAutoAdjustState] = useState<boolean>(() =>
    getAutoAdjustEnabled(),
  )

  const reload = () => forceReload((n) => n + 1)

  useEffect(() => {
    reload()
  }, [helio.isConnected, helio.hrvRecording, helio.hrvProgress])

  const todaysHrv = getTodaysHrv()
  const today = useMemo(
    () => getTodaysFreshness(),
    [helio.hrvRecording, helio.isConnected, formOpen],
  )
  const hasFormEntry = useMemo(() => {
    return getFreshnessLog().some((e) => e.date === todayKey())
  }, [helio.hrvRecording, helio.isConnected, formOpen])

  // ============ STATES ============

  // A) Web Bluetooth unsupported
  if (!helio.supported) {
    return (
      <div className="nk-card p-5 space-y-4">
        <Header title="Freshness Score" subtitle="Helio Strap required" />
        <HelioStrapConnector />
      </div>
    )
  }

  // B) No HRV today
  if (todaysHrv == null) {
    return (
      <div className="nk-card p-5 space-y-4">
        <Header title="Freshness Score" subtitle="Start with an HRV measurement" />
        <p className="text-xs text-white/55 leading-relaxed">
          Connect your Helio Strap and run a 2-min calm measurement to enable
          automatic load adjustment.
        </p>
        <HelioStrapConnector onHrvRecorded={() => reload()} />
      </div>
    )
  }

  // C) HRV present but no subjective form yet
  if (!hasFormEntry || today == null) {
    return (
      <div className="nk-card p-5 space-y-4">
        <Header title="Freshness Score" subtitle="HRV captured — log your feeling" />
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="size-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <Activity className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="nk-eyebrow text-white/45">Today's HRV</p>
            <p className="text-2xl font-black nk-num leading-none mt-1">
              {todaysHrv}
              <span className="text-xs text-white/40 ml-1.5 font-bold tracking-widest">
                MS
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="nk-cta !w-auto !px-5 !py-2.5 text-xs"
          >
            Log
          </button>
        </div>
        <FreshnessForm
          open={formOpen}
          onOpenChange={(v) => {
            setFormOpen(v)
            if (!v) reload()
          }}
          todaysHrv={todaysHrv}
        />
      </div>
    )
  }

  // D) Full score
  return (
    <div className="nk-card p-5 space-y-5">
      <Header title="Freshness Score" subtitle="Your state today" />
      <ScoreBlock result={today.result} />
      <p className="text-sm text-white/80 leading-relaxed">
        {today.result.message}
      </p>
      <Breakdown result={today.result} />

      {/* Auto-adjust */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 p-3 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
            <Zap className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold leading-tight">
              Auto-Adjust Loads
            </p>
            <p className="text-[10px] text-white/45 mt-0.5">
              Tune workout intensity to today's score
            </p>
          </div>
        </div>
        <Switch
          checked={autoAdjust}
          onCheckedChange={(v) => {
            setAutoAdjustState(v)
            setAutoAdjustEnabled(v)
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="nk-cta-ghost !text-xs"
      >
        <Edit3 className="size-3.5" />
        Edit Today's Entry
      </button>

      <FreshnessForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v)
          if (!v) reload()
        }}
        todaysHrv={todaysHrv}
      />
    </div>
  )
}

function Header({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 rounded-xl bg-white text-black flex items-center justify-center shrink-0">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="nk-eyebrow text-white/45">{subtitle}</p>
        <p className="text-base font-black tracking-tight uppercase mt-0.5">
          {title}
        </p>
      </div>
    </div>
  )
}

function ScoreBlock({ result }: { result: FreshnessResult }) {
  const color = bandColor(result.band)
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="nk-eyebrow text-white/40 mb-1">Score</p>
          <div className="flex items-baseline gap-2">
            <span
              className="text-6xl font-black nk-num leading-none tracking-tighter"
              style={{ color }}
            >
              {result.score}
            </span>
            <span className="text-sm font-extrabold text-white/40 nk-num">
              /100
            </span>
          </div>
        </div>
        <div
          className="size-16 rounded-2xl flex items-center justify-center text-3xl border"
          style={{
            backgroundColor: color + "1f",
            borderColor: color + "55",
          }}
        >
          <span>{result.emoji}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="h-1 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${result.score}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}88`,
          }}
        />
      </div>

      <p
        className="nk-eyebrow"
        style={{ color }}
      >
        {result.coefficient < 1
          ? `Loads scaled to ${Math.round(result.coefficient * 100)}%`
          : "Normal Loads"}
      </p>
    </div>
  )
}

function Breakdown({ result }: { result: FreshnessResult }) {
  const cells = [
    { label: "HRV", value: Math.round(result.breakdown.hrv) },
    { label: "Sleep", value: Math.round(result.breakdown.sleep) },
    { label: "Stress", value: Math.round(result.breakdown.stress) },
    { label: "Fatigue", value: Math.round(result.breakdown.fatigue) },
  ]
  return (
    <div className="space-y-2">
      <p className="nk-eyebrow text-white/40">Breakdown</p>
      <div className="grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center"
          >
            <p
              className={cn(
                "text-[9px] font-extrabold uppercase tracking-widest text-white/45",
              )}
            >
              {c.label}
            </p>
            <p className="text-base font-black nk-num mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
