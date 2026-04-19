import { useState } from "react"
import { Bluetooth, BluetoothOff, Heart, Loader2, RefreshCw, Watch } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  appendHrvHistory,
  getTodaysHrv,
  saveTodaysHrv,
  useHelioStrap,
} from "@/lib/helioStrap"

interface HelioStrapConnectorProps {
  onHrvRecorded?: (hrv: number) => void
  className?: string
  /** Display a compact version (for embedding in small cards). */
  compact?: boolean
}

export function HelioStrapConnector({
  onHrvRecorded,
  className,
  compact,
}: HelioStrapConnectorProps) {
  const helio = useHelioStrap()
  const [recordError, setRecordError] = useState<string | null>(null)
  const [todaysHrv, setTodaysHrvState] = useState<number | null>(() =>
    getTodaysHrv(),
  )

  if (!helio.supported) {
    return (
      <div
        className={cn(
          "rounded-xl border border-amber-500/30 bg-amber-500/8 p-4",
          className,
        )}
      >
        <p className="nk-eyebrow text-amber-300 mb-1.5">Bluetooth Required</p>
        <p className="text-xs text-amber-100/85 leading-relaxed">
          On iPhone, use the <strong className="text-amber-50">Bluefy</strong>{" "}
          browser app to connect your Helio Strap. On desktop, use Chrome, Edge
          or Brave.
        </p>
      </div>
    )
  }

  const startHrvRecord = async () => {
    setRecordError(null)
    try {
      const rmssd = await helio.recordHrvSession(120)
      saveTodaysHrv(rmssd)
      appendHrvHistory(rmssd)
      setTodaysHrvState(rmssd)
      onHrvRecorded?.(rmssd)
    } catch (err) {
      setRecordError(
        err instanceof Error ? err.message : "HRV recording failed",
      )
    }
  }

  const isWorking = helio.status === "scanning" || helio.status === "connecting"

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status block */}
      <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <div
          className={cn(
            "size-10 rounded-xl flex items-center justify-center shrink-0 border",
            helio.isConnected
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : isWorking
                ? "bg-white/10 border-white/15 text-white/70"
                : "bg-white/5 border-white/10 text-white/40",
          )}
        >
          {helio.isConnected ? (
            <Bluetooth className="size-4" />
          ) : isWorking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Watch className="size-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="nk-eyebrow text-white/40">Helio Strap</p>
          <p className="text-sm font-extrabold mt-0.5 truncate">
            {helio.isConnected
              ? helio.deviceName ?? "Connected"
              : isWorking
                ? helio.status === "scanning"
                  ? "Searching…"
                  : "Connecting…"
                : "Not connected"}
          </p>
        </div>
        {helio.isConnected && helio.currentBPM != null && (
          <div className="flex items-center gap-1.5 text-red-400 shrink-0">
            <Heart className="size-3.5 fill-current" strokeWidth={0} />
            <span className="text-base font-black nk-num">
              {helio.currentBPM}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/40">
              bpm
            </span>
          </div>
        )}
      </div>

      <p className="text-[10px] text-white/35 leading-snug px-1">
        One Bluetooth connection powers Freshness, the HR monitor, and your
        workouts.
      </p>

      {/* Actions */}
      {!helio.isConnected ? (
        helio.status === "disconnected" ? (
          <button
            type="button"
            onClick={helio.reconnect}
            className="nk-cta !text-xs"
          >
            <RefreshCw className="size-3.5" />
            Reconnect Helio Strap
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void helio.connect()}
            disabled={isWorking}
            className="nk-cta !text-xs"
          >
            {isWorking ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {helio.status === "scanning" ? "Searching…" : "Connecting…"}
              </>
            ) : (
              <>
                <Bluetooth className="size-3.5" />
                Connect Helio Strap
              </>
            )}
          </button>
        )
      ) : (
        <>
          {/* HRV recording */}
          {helio.hrvRecording ? (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="nk-eyebrow text-white/40">HRV Capture</p>
                  <p className="text-sm font-extrabold mt-0.5">
                    Breathe calmly…
                  </p>
                </div>
                <span className="text-2xl font-black nk-num shrink-0">
                  {Math.round(helio.hrvProgress * 100)}
                  <span className="text-[10px] font-extrabold tracking-widest text-white/40 ml-1">
                    %
                  </span>
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full bg-white transition-all rounded-full"
                  style={{
                    width: `${helio.hrvProgress * 100}%`,
                    boxShadow: "0 0 12px rgba(255,255,255,0.4)",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startHrvRecord}
                className={cn(
                  todaysHrv != null ? "nk-cta-ghost" : "nk-cta",
                  "!text-xs",
                )}
              >
                <Heart className="size-3.5" />
                {todaysHrv != null
                  ? `Re-measure HRV · ${todaysHrv}ms`
                  : "Measure HRV · 2 min"}
              </button>
              {!compact && (
                <button
                  type="button"
                  onClick={helio.disconnect}
                  className="nk-icon-btn shrink-0"
                  aria-label="Disconnect"
                >
                  <BluetoothOff className="size-4" />
                </button>
              )}
            </div>
          )}
          {recordError && (
            <p className="text-xs text-red-400 leading-relaxed">
              {recordError}
            </p>
          )}
        </>
      )}

      {!helio.isConnected && helio.error && (
        <p className="text-xs text-red-400 leading-relaxed">{helio.error}</p>
      )}
    </div>
  )
}
