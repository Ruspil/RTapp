import { useState } from "react"
import {
  ChevronLeft,
  Heart,
  Bluetooth,
  BluetoothOff,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react"
import { useHeartRateMonitor } from "@/hooks/useHeartRateMonitor"
import {
  calculateMaxHR,
  calculateAverageBPM,
  saveSession,
  HR_ZONES,
  type HRSession,
} from "@/lib/heartRateUtils"
import { BPMChart } from "@/components/BPMChart"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ZoneSeconds } from "@/hooks/useHeartRateMonitor"

interface HeartRateMonitorProps {
  onBack: () => void
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, "0")}:${String(Math.floor(sec)).padStart(2, "0")}`
}

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  scanning: "Searching",
  connecting: "Connecting",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
  unsupported: "Unsupported",
}

function StatusPill({ status }: { status: string }) {
  const isOk = status === "connected"
  const isWorking = status === "scanning" || status === "connecting"
  const isWarn =
    status === "disconnected" || status === "error" || status === "unsupported"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border",
        isOk &&
          "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
        isWorking && "bg-white/10 border-white/15 text-white/70",
        isWarn && "bg-red-500/10 border-red-500/30 text-red-300",
        !isOk && !isWorking && !isWarn && "bg-white/5 border-white/10 text-white/45",
      )}
    >
      {isOk && <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" />}
      {isWorking && <Loader2 className="size-3 animate-spin" />}
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function HeartRateMonitor({ onBack }: HeartRateMonitorProps) {
  const [age, setAge] = useState<number | null>(() => {
    const stored = localStorage.getItem("userAge")
    return stored ? parseInt(stored) : null
  })
  const [showAgeModal, setShowAgeModal] = useState(false)
  const [ageInput, setAgeInput] = useState("")
  const [showSummary, setShowSummary] = useState(false)
  const [savedSamples, setSavedSamples] = useState<any[]>([])
  const [savedAvgBPM, setSavedAvgBPM] = useState(0)
  const [savedDuration, setSavedDuration] = useState(0)
  const [savedZoneSeconds, setSavedZoneSeconds] = useState<ZoneSeconds>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  })

  const maxHR = age ? calculateMaxHR(age) : 200
  const hrm = useHeartRateMonitor(maxHR)

  const isUnsupported = hrm.status === "unsupported"

  const handleConnectClick = () => {
    if (!age) {
      setShowAgeModal(true)
    } else {
      hrm.connect()
    }
  }

  const handleAgeSubmit = () => {
    const parsed = parseInt(ageInput)
    if (parsed > 0 && parsed < 120) {
      setAge(parsed)
      localStorage.setItem("userAge", String(parsed))
      setShowAgeModal(false)
      setAgeInput("")
      hrm.connect()
    }
  }

  const handleStopSession = async () => {
    const { sessionSamples, zoneSeconds } = hrm
    hrm.stopSession()

    if (sessionSamples.length > 0) {
      const avgBPM = calculateAverageBPM(sessionSamples)
      const duration =
        (sessionSamples[sessionSamples.length - 1].timestamp -
          sessionSamples[0].timestamp) /
        1000

      setSavedSamples(sessionSamples)
      setSavedAvgBPM(avgBPM)
      setSavedDuration(duration)
      setSavedZoneSeconds(zoneSeconds)
      setShowSummary(true)

      if (age) {
        const session: HRSession = {
          id: `hrm-${Date.now()}`,
          startTime: sessionSamples[0].timestamp,
          endTime: sessionSamples[sessionSamples.length - 1].timestamp,
          deviceName: hrm.deviceName ?? "Unknown",
          samples: sessionSamples,
          maxHR,
          age,
        }
        try {
          await saveSession(session)
        } catch (e) {
          console.error("Failed to save session:", e)
        }
      }
    }
  }

  const currentZoneInfo = hrm.currentZone
    ? HR_ZONES[hrm.currentZone as keyof typeof HR_ZONES]
    : null

  const isWorking = hrm.status === "scanning" || hrm.status === "connecting"

  return (
    <div className="nk-page">
      {/* Top bar */}
      <header className="nk-topbar">
        <button
          type="button"
          onClick={onBack}
          className="nk-icon-btn"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="nk-eyebrow text-white/40">Heart Rate</span>
        <StatusPill status={hrm.status} />
      </header>

      {/* Page hero */}
      <section className="px-6 pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="size-4 text-red-500 fill-red-500" />
          <span className="nk-eyebrow text-white/40">Live BPM</span>
        </div>
        <h1 className="nk-h-display">Pulse</h1>
      </section>

      {/* Unsupported warning */}
      {isUnsupported && (
        <section className="nk-stack-lg">
          <div className="nk-card p-5 border-amber-500/30 bg-amber-500/5">
            <div className="flex gap-3">
              <AlertTriangle className="size-5 text-amber-300 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="nk-eyebrow text-amber-300 mb-1.5">
                  Web Bluetooth Required
                </p>
                <p className="text-xs text-amber-100/85 leading-relaxed">
                  Use Chrome, Edge, Brave on desktop, or the Bluefy browser on
                  iOS to connect a heart rate monitor.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HERO BPM display */}
      <section className="nk-stack-lg">
        <div
          className="nk-hero p-8 text-center relative overflow-hidden"
          style={
            currentZoneInfo
              ? {
                  borderColor: currentZoneInfo.color + "55",
                  boxShadow: `0 0 60px ${currentZoneInfo.color}22`,
                }
              : undefined
          }
        >
          <p className="nk-eyebrow text-white/45 mb-3">
            {hrm.isConnected ? "Live Heart Rate" : "Awaiting Signal"}
          </p>
          <div
            className="font-black nk-num leading-none transition-colors duration-500 tracking-tighter"
            style={{
              fontSize: "clamp(96px, 26vw, 160px)",
              color: currentZoneInfo?.color ?? "#ffffff",
              textShadow: currentZoneInfo
                ? `0 0 40px ${currentZoneInfo.color}66`
                : "0 0 40px rgba(255,255,255,0.18)",
            }}
          >
            {hrm.currentBPM ?? "—"}
          </div>
          <p className="nk-eyebrow text-white/45 mt-2">BPM</p>

          <div className="mt-6">
            {currentZoneInfo ? (
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest border"
                style={{
                  backgroundColor: currentZoneInfo.color + "1f",
                  borderColor: currentZoneInfo.color + "55",
                  color: currentZoneInfo.color,
                }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: currentZoneInfo.color }}
                />
                Zone {hrm.currentZone} · {currentZoneInfo.name}
              </span>
            ) : (
              <span className="nk-chip">
                {hrm.isConnected ? "Waiting for signal…" : "Not connected"}
              </span>
            )}
          </div>

          {hrm.isConnected && (
            <p className="text-[10px] text-white/35 mt-4 uppercase tracking-widest font-extrabold">
              Max HR · <span className="nk-num">{maxHR}</span> bpm
            </p>
          )}
        </div>
      </section>

      {/* Connection / device controls */}
      <section className="nk-stack-lg">
        <h2 className="nk-h-section">Connection</h2>

        {hrm.deviceName && (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <div className="size-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Bluetooth className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="nk-eyebrow text-white/40">Device</p>
              <p className="text-sm font-extrabold mt-0.5 truncate">
                {hrm.deviceName}
              </p>
            </div>
          </div>
        )}

        {hrm.error && (
          <div className="flex gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-200 leading-relaxed">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{hrm.error}</span>
          </div>
        )}

        {/* Big connect / disconnect button */}
        {!hrm.isConnected && !isWorking ? (
          <button
            type="button"
            onClick={handleConnectClick}
            disabled={isUnsupported}
            className="nk-cta"
          >
            <Bluetooth className="size-4" />
            Connect Heart Rate Monitor
          </button>
        ) : isWorking ? (
          <button type="button" disabled className="nk-cta" aria-busy>
            <Loader2 className="size-4 animate-spin" />
            {hrm.status === "scanning"
              ? "Searching for devices…"
              : `Connecting to ${hrm.deviceName ?? "device"}…`}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={hrm.disconnect}
              className="nk-cta-ghost"
            >
              <BluetoothOff className="size-4" />
              Disconnect
            </button>
            {hrm.status === "disconnected" && (
              <button
                type="button"
                onClick={hrm.reconnect}
                className="nk-cta"
              >
                <RefreshCw className="size-4" />
                Reconnect
              </button>
            )}
          </div>
        )}
      </section>

      {/* Session controls */}
      {hrm.isConnected && (
        <section className="nk-stack-lg">
          <h2 className="nk-h-section">Session</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={hrm.startSession}
              disabled={hrm.sessionActive}
              className={cn(
                hrm.sessionActive ? "nk-cta-ghost" : "nk-cta",
                "disabled:opacity-40",
              )}
            >
              <Play className="size-4 fill-current" strokeWidth={0} />
              Start
            </button>
            <button
              type="button"
              onClick={handleStopSession}
              disabled={!hrm.sessionActive}
              className="nk-cta-ghost disabled:opacity-40"
              style={
                hrm.sessionActive
                  ? {
                      borderColor: "rgba(248,113,113,0.4)",
                      color: "rgb(252,165,165)",
                    }
                  : undefined
              }
            >
              <Square className="size-4 fill-current" strokeWidth={0} />
              Stop
            </button>
          </div>
        </section>
      )}

      {/* Live zone timers */}
      {hrm.sessionActive && (
        <section className="nk-stack-lg">
          <h2 className="nk-h-section">Live Zone Time</h2>
          <div className="nk-card p-3 space-y-1">
            {Object.entries(HR_ZONES).map(([zoneNum, zoneInfo]) => {
              const z = parseInt(zoneNum) as keyof typeof hrm.zoneSeconds
              const secs = hrm.zoneSeconds[z] ?? 0
              const isCurrentZone = hrm.currentZone === parseInt(zoneNum)
              return (
                <div
                  key={zoneNum}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    isCurrentZone && "bg-white/5",
                  )}
                  style={
                    isCurrentZone
                      ? {
                          boxShadow: `inset 0 0 0 1px ${zoneInfo.color}40`,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "size-2.5 rounded-full shrink-0",
                        isCurrentZone && "animate-pulse",
                      )}
                      style={{ backgroundColor: zoneInfo.color }}
                    />
                    <span
                      className={cn(
                        "text-[11px] font-extrabold uppercase tracking-widest",
                        isCurrentZone ? "text-white" : "text-white/45",
                      )}
                    >
                      Z{zoneNum} · {zoneInfo.name}
                    </span>
                    {isCurrentZone && (
                      <span className="text-[9px] font-bold text-white/60 tracking-widest">
                        NOW
                      </span>
                    )}
                  </div>
                  <span
                    className="text-sm font-black nk-num shrink-0"
                    style={{
                      color: isCurrentZone ? zoneInfo.color : "#52525b",
                    }}
                  >
                    {formatSeconds(secs)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Age modal */}
      <Dialog open={showAgeModal} onOpenChange={setShowAgeModal}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">
              Your Age
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/55 leading-relaxed">
            We need your age to calculate your heart rate zones (Max HR = 220 −
            age).
          </p>
          <div className="space-y-3 mt-2">
            <div>
              <label className="nk-eyebrow text-white/45 mb-2 block">Age</label>
              <Input
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 28"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAgeSubmit()}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 h-12 text-lg font-extrabold nk-num"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={handleAgeSubmit}
              disabled={
                !ageInput ||
                parseInt(ageInput) <= 0 ||
                parseInt(ageInput) >= 120
              }
              className="nk-cta"
            >
              Connect Monitor
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session summary modal */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-2">
              <Heart className="size-5 text-red-500 fill-red-500" />
              Session Summary
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="nk-stat">
                <span className="nk-stat-label">Avg BPM</span>
                <span className="nk-stat-value">{savedAvgBPM}</span>
              </div>
              <div className="nk-stat">
                <span className="nk-stat-label">Duration</span>
                <span className="nk-stat-value nk-num">
                  {Math.floor(savedDuration / 60)}:
                  {String(Math.floor(savedDuration % 60)).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Chart */}
            {savedSamples.length > 0 && (
              <div>
                <p className="nk-eyebrow text-white/40 mb-2.5">
                  Heart Rate Trend
                </p>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <BPMChart samples={savedSamples} maxHR={maxHR} />
                </div>
              </div>
            )}

            {/* Zone breakdown */}
            <div>
              <p className="nk-eyebrow text-white/40 mb-2.5">Time in Zones</p>
              <div className="nk-card p-3 space-y-1">
                {Object.entries(HR_ZONES).map(([zoneNum, zoneInfo]) => {
                  const secs =
                    savedZoneSeconds[parseInt(zoneNum) as keyof ZoneSeconds] ??
                    0
                  return (
                    <div
                      key={zoneNum}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    >
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: zoneInfo.color }}
                      />
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/65 flex-1">
                        Z{zoneNum} · {zoneInfo.name}
                      </span>
                      <span
                        className="text-sm font-black nk-num"
                        style={{ color: zoneInfo.color }}
                      >
                        {formatSeconds(secs)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSummary(false)}
              className="nk-cta"
            >
              <X className="size-4" />
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
