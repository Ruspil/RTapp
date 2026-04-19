import { useState, lazy, Suspense } from "react"
import {
  Watch,
  Sparkles,
  ShieldAlert,
  Wand2,
  Volume2,
  RotateCcw,
  Trash2,
  Heart,
  ChevronRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useHelioStrap } from "@/lib/helioStrap"
import {
  getSfxEnabled,
  getSfxVolume,
  setSfxEnabled,
  setSfxVolume,
} from "@/lib/soundSettings"
import { unlockWorkoutAudio } from "@/lib/workoutSounds"
import { getAIPlan } from "@/lib/aiPlan/storage"
import type { CompletedSession } from "@/lib/workoutData"

// Heavy panels rendered only on user action — lazy-load to keep the Profile
// chunk small. Each one fetches its own JS chunk + dependencies (recharts,
// the AI plan builder, etc.) only when the user actually opens the sheet.
const FreshnessCard = lazy(() =>
  import("@/components/FreshnessCard").then((m) => ({ default: m.FreshnessCard })),
)
const InjuryRiskCard = lazy(() =>
  import("@/components/InjuryRiskCard").then((m) => ({ default: m.InjuryRiskCard })),
)
const PlanBuilderSheet = lazy(() =>
  import("@/components/ai-plan/PlanBuilderSheet").then((m) => ({
    default: m.PlanBuilderSheet,
  })),
)

function PanelFallback() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
      <p className="nk-eyebrow text-white/40">Loading…</p>
    </div>
  )
}

interface ProfileProps {
  userName: string
  completedSessions: CompletedSession[]
  onNavigateToHeartRate: () => void
  /**
   * Called when the user wants to confirm a destructive reset. The parent
   * (App) renders the actual confirmation dialog at the top level so it
   * isn't trapped inside the SwipeTabs CSS transform (which would make
   * `position: fixed` behave like `position: absolute`).
   */
  onRequestReset: (kind: "progress" | "full") => void
  /** Called when the user updates their first name from the AI Plan builder. */
  onUserNameUpdate?: (name: string) => void
}

interface RowDef {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  iconAccent?: string
  onClick: () => void
  trailing?: React.ReactNode
  destructive?: boolean
}

export default function Profile({
  userName,
  completedSessions,
  onNavigateToHeartRate,
  onRequestReset,
  onUserNameUpdate,
}: ProfileProps) {
  const helio = useHelioStrap()
  const [freshnessOpen, setFreshnessOpen] = useState(false)
  const [injuryOpen, setInjuryOpen] = useState(false)
  const [aiPlanOpen, setAIPlanOpen] = useState(false)
  const [sfxEnabled, setSfxEnabledState] = useState(getSfxEnabled)
  const [sfxVolume, setSfxVolumeState] = useState(getSfxVolume)
  const [aiPlanReady, setAIPlanReady] = useState<boolean>(() => !!getAIPlan())

  const helioStatusLabel = !helio.supported
    ? "Not supported"
    : helio.isConnected
      ? "Connected"
      : helio.status === "scanning" || helio.status === "connecting"
        ? "…"
        : "Tap to connect"

  const performanceRows: RowDef[] = [
    {
      id: "freshness",
      label: "Freshness Score",
      hint: "Recovery readiness",
      icon: Sparkles,
      onClick: () => setFreshnessOpen(true),
    },
    {
      id: "injury",
      label: "Injury Risk",
      hint: "Workload analysis",
      icon: ShieldAlert,
      onClick: () => setInjuryOpen(true),
    },
    {
      id: "heart",
      label: "Heart Rate Monitor",
      hint: "BLE sensor live",
      icon: Heart,
      onClick: () => onNavigateToHeartRate(),
    },
  ]

  const deviceRows: RowDef[] = [
    {
      id: "helio",
      label: "Helio Strap",
      hint: helioStatusLabel,
      icon: Watch,
      onClick: async () => {
        if (!helio.supported) return
        if (helio.isConnected) helio.disconnect()
        else if (helio.status === "disconnected") await helio.reconnect()
        else await helio.connect()
      },
      trailing: helio.isConnected ? (
        <span className="nk-chip nk-chip-solid">On</span>
      ) : null,
    },
  ]

  const planRows: RowDef[] = [
    {
      id: "ai-plan",
      label: "AI Personal Plan",
      hint: aiPlanReady ? "Plan ready" : "Generate yours",
      icon: Wand2,
      onClick: () => setAIPlanOpen(true),
      trailing: aiPlanReady ? (
        <span className="nk-chip nk-chip-solid">Ready</span>
      ) : null,
    },
  ]

  const dangerRows: RowDef[] = [
    {
      id: "reset-progress",
      label: "Reset Program Progress",
      hint: "Keep account & AI plan",
      icon: RotateCcw,
      onClick: () => onRequestReset("progress"),
    },
    {
      id: "full-reset",
      label: "Full App Reset",
      hint: "Delete everything",
      icon: Trash2,
      onClick: () => onRequestReset("full"),
      destructive: true,
    },
  ]

  return (
    <div className="nk-page">
      <header className="nk-topbar">
        <div className="flex flex-col">
          <span className="nk-eyebrow text-white/40">Profile</span>
          <span className="text-base font-extrabold tracking-tight">
            SETTINGS
          </span>
        </div>
      </header>

      {/* Identity card */}
      <section className="px-6 pt-4">
        <div className="nk-hero p-6 sm:p-7">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-white text-black flex items-center justify-center font-black text-xl">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="nk-eyebrow text-white/45">Athlete</span>
              <h1 className="text-2xl font-black tracking-tight leading-none mt-1.5 truncate">
                {userName.toUpperCase()}
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="nk-stat">
              <span className="nk-stat-label">Sessions</span>
              <span className="nk-stat-value">{completedSessions.length}</span>
            </div>
            <div className="nk-stat">
              <span className="nk-stat-label">Helio</span>
              <span className="nk-stat-value text-base pt-1">
                {helio.isConnected ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* spacing v2 */}
      <SettingsGroup title="Performance" rows={performanceRows} />
      <SettingsGroup title="Devices" rows={deviceRows} />
      <SettingsGroup title="Coach" rows={planRows} />

      {/* Sound settings — inline */}
      <section className="nk-stack-lg pt-32">
        <h2 className="nk-h-section">Sound</h2>
        <div className="nk-card p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Volume2 className="size-4" />
              </div>
              <span className="font-extrabold text-sm">SFX</span>
            </div>
            <Switch
              checked={sfxEnabled}
              onCheckedChange={async (v) => {
                setSfxEnabledState(v)
                setSfxEnabled(v)
                if (v) await unlockWorkoutAudio()
              }}
            />
          </div>
          <div
            className={cn(
              "flex items-center gap-3",
              !sfxEnabled && "opacity-40",
            )}
          >
            <Slider
              min={0}
              max={100}
              value={[sfxVolume]}
              onValueChange={(vals) => {
                const n = vals[0] ?? 0
                setSfxVolumeState(n)
                setSfxVolume(n)
              }}
              disabled={!sfxEnabled}
            />
            <span className="w-12 text-right text-xs font-extrabold nk-num text-white/70">
              {sfxVolume}%
            </span>
          </div>
        </div>
      </section>

      <SettingsGroup title="Danger Zone" rows={dangerRows} />

      {/* Sheets — only mount their heavy contents while open to defer the
          chunk download until the user actually taps. */}
      <Sheet open={freshnessOpen} onOpenChange={setFreshnessOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Freshness Score</SheetTitle>
          </SheetHeader>
          <div className="pt-4 pb-2">
            {freshnessOpen && (
              <Suspense fallback={<PanelFallback />}>
                <FreshnessCard />
              </Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={injuryOpen} onOpenChange={setInjuryOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Injury Risk</SheetTitle>
            <SheetDescription>
              Demo data — full analysis with Helio Strap connected.
            </SheetDescription>
          </SheetHeader>
          <div className="pt-4 pb-2">
            {injuryOpen && (
              <Suspense fallback={<PanelFallback />}>
                <InjuryRiskCard completedSessions={completedSessions} />
              </Suspense>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {aiPlanOpen && (
        <Suspense fallback={null}>
          <PlanBuilderSheet
            open={aiPlanOpen}
            onOpenChange={(v) => {
              setAIPlanOpen(v)
              if (!v) setAIPlanReady(!!getAIPlan())
            }}
            onPlanGenerated={() => setAIPlanReady(!!getAIPlan())}
            onResetAIPlan={() => setAIPlanReady(false)}
            onFullReset={() => onRequestReset("full")}
            onUserNameUpdate={onUserNameUpdate}
          />
        </Suspense>
      )}
    </div>
  )
}

function SettingsGroup({
  title,
  rows,
}: {
  title: string
  rows: RowDef[]
}) {
  return (
    <section className="nk-stack-lg pt-32">
      <h2 className="nk-h-section">{title}</h2>
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <button
              key={row.id}
              type="button"
              onClick={row.onClick}
              className={cn(
                "nk-tile gap-4 p-4",
                row.destructive && "border-red-500/30 hover:border-red-500/50",
              )}
            >
              <div
                className={cn(
                  "size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0",
                  row.destructive &&
                    "bg-red-500/10 border-red-500/30 text-red-400",
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-extrabold text-sm leading-tight",
                    row.destructive && "text-red-300",
                  )}
                >
                  {row.label}
                </p>
                {row.hint && (
                  <p className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
                    {row.hint}
                  </p>
                )}
              </div>
              {row.trailing}
              <ChevronRight className="size-4 text-white/30 shrink-0" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
