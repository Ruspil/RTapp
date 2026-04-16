import { useState } from 'react'
import { ChevronDown, ChevronUp, Heart, Bluetooth, BluetoothOff, BluetoothSearching, Play, Square, RefreshCw, AlertTriangle } from 'lucide-react'
import { useHeartRateMonitor } from '@/hooks/useHeartRateMonitor'
import { HR_ZONES, calculateAverageBPM, calculateMaxHR } from '@/lib/heartRateUtils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WorkoutExercise } from '@/lib/workoutData'
import { CardioZoneFeedback } from '@/components/CardioZoneFeedback'
import { pushCardioHistory } from '@/lib/liftStorage'
import { fractionTimeInTarget, getTargetZonesForExercise } from '@/lib/zoneTargets'

interface HRMWidgetProps {
  maxHR?: number
  /** When set, HR session summaries and zone targets relate to this exercise. */
  trackingExercise?: WorkoutExercise | null
}

export function HRMWidget({ maxHR: maxHRProp, trackingExercise = null }: HRMWidgetProps) {
  const [expanded, setExpanded] = useState(false)

  const storedAge = localStorage.getItem('userAge')
  const age = storedAge ? parseInt(storedAge) : null
  const maxHR = maxHRProp ?? (age ? calculateMaxHR(age) : 190)

  const hrm = useHeartRateMonitor(maxHR)

  const currentZoneInfo = hrm.currentZone
    ? HR_ZONES[hrm.currentZone as keyof typeof HR_ZONES]
    : null

  const handleSessionToggle = () => {
    if (hrm.sessionActive) {
      if (trackingExercise && hrm.sessionSamples.length > 0) {
        const target = getTargetZonesForExercise(trackingExercise)
        if (target) {
          const pct = fractionTimeInTarget(hrm.zoneSeconds, target)
          const avg = calculateAverageBPM(hrm.sessionSamples)
          pushCardioHistory({
            exerciseKey: trackingExercise.id.replace(/-w\d+$/i, ''),
            at: new Date().toISOString(),
            pctInTarget: pct,
            avgBpm: avg,
          })
        }
      }
      hrm.stopSession()
    } else {
      hrm.startSession()
    }
  }

  // Unsupported browser
  if (hrm.status === 'unsupported') {
    return (
      <Card className="bg-zinc-900 border-zinc-800 mb-3">
        <CardContent className="p-3 flex gap-2 items-start">
          <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-400">
            Web Bluetooth required. Use Chrome, Edge, Brave, or Bluefy on iOS.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 mb-3 overflow-hidden">
      {/* Collapsed Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Heart
            className={cn(
              'size-4 transition-colors',
              hrm.isConnected ? 'text-red-500 fill-red-500' : 'text-zinc-500'
            )}
          />
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-black tabular-nums leading-none transition-colors duration-300"
              style={{ color: currentZoneInfo?.color ?? '#ffffff' }}
            >
              {hrm.currentBPM ?? '--'}
            </span>
            <span className="text-xs text-zinc-500 font-semibold">BPM</span>
            {currentZoneInfo && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: currentZoneInfo.color + '25',
                  color: currentZoneInfo.color,
                }}
              >
                Z{hrm.currentZone}
              </span>
            )}
            {hrm.sessionActive && (
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            HR
          </span>
          {expanded ? (
            <ChevronUp className="size-4 text-zinc-500" />
          ) : (
            <ChevronDown className="size-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-3">
          {/* Status row */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {hrm.status === 'scanning' && 'Searching for devices...'}
              {hrm.status === 'connecting' && `Connecting to ${hrm.deviceName ?? 'device'}...`}
              {hrm.status === 'connected' && hrm.deviceName && `Connected · ${hrm.deviceName}`}
              {hrm.status === 'disconnected' && 'Device disconnected'}
              {hrm.status === 'error' && (hrm.error ?? 'Connection error')}
              {hrm.status === 'idle' && 'Not connected'}
            </span>
            {hrm.isConnected && (
              <span className="text-zinc-600">Max: {maxHR}</span>
            )}
          </div>

          {/* Zone bar (when connected) */}
          {hrm.isConnected && (
            <div className="flex gap-1">
              {Object.entries(HR_ZONES).map(([zoneNum, zoneInfo]) => {
                const isActive = hrm.currentZone === parseInt(zoneNum)
                return (
                  <div
                    key={zoneNum}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: isActive ? zoneInfo.color : zoneInfo.color + '30',
                      transform: isActive ? 'scaleY(2)' : 'scaleY(1)',
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!hrm.isConnected && hrm.status !== 'scanning' && hrm.status !== 'connecting' ? (
              <Button
                onClick={hrm.connect}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-xs font-bold"
              >
                <BluetoothSearching className="size-3.5 mr-1.5" />
                Connect Monitor
              </Button>
            ) : hrm.status === 'scanning' || hrm.status === 'connecting' ? (
              <Button
                disabled
                className="flex-1 h-9 bg-zinc-800 text-zinc-500 text-xs cursor-not-allowed"
              >
                <BluetoothSearching className="size-3.5 mr-1.5 animate-pulse" />
                {hrm.status === 'scanning' ? 'Scanning...' : 'Connecting...'}
              </Button>
            ) : (
              <>
                {hrm.status === 'disconnected' ? (
                  <Button
                    onClick={hrm.reconnect}
                    className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                  >
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Reconnect
                  </Button>
                ) : (
                  <Button
                    onClick={handleSessionToggle}
                    className={cn(
                      'flex-1 h-9 text-xs font-bold',
                      hrm.sessionActive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                  >
                    {hrm.sessionActive ? (
                      <>
                        <Square className="size-3.5 mr-1.5" />
                        Stop HR Session
                      </>
                    ) : (
                      <>
                        <Play className="size-3.5 mr-1.5" />
                        Start HR Session
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={hrm.disconnect}
                  variant="outline"
                  className="h-9 px-3 border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-xs"
                >
                  <BluetoothOff className="size-3.5" />
                </Button>
              </>
            )}
          </div>

          {/* Zone timers during active session */}
          {hrm.sessionActive && (
            <div className="grid grid-cols-5 gap-1 pt-1">
              {Object.entries(HR_ZONES).map(([zoneNum, zoneInfo]) => {
                const z = parseInt(zoneNum) as keyof typeof hrm.zoneSeconds
                const secs = hrm.zoneSeconds[z] ?? 0
                const mm = String(Math.floor(secs / 60)).padStart(2, '0')
                const ss = String(Math.floor(secs % 60)).padStart(2, '0')
                const isActive = hrm.currentZone === parseInt(zoneNum)
                return (
                  <div
                    key={zoneNum}
                    className={cn(
                      'rounded-lg p-2 text-center transition-colors',
                      isActive ? 'bg-zinc-700' : 'bg-zinc-800'
                    )}
                  >
                    <div
                      className="size-1.5 rounded-full mx-auto mb-1"
                      style={{ backgroundColor: zoneInfo.color }}
                    />
                    <p
                      className="text-[10px] font-black tabular-nums leading-none"
                      style={{ color: isActive ? zoneInfo.color : '#52525b' }}
                    >
                      {mm}:{ss}
                    </p>
                    <p className="text-[8px] text-zinc-600 mt-0.5">Z{zoneNum}</p>
                  </div>
                )
              })}
            </div>
          )}

          {trackingExercise && hrm.sessionActive && getTargetZonesForExercise(trackingExercise) && (
            <CardioZoneFeedback
              exercise={trackingExercise}
              zoneSeconds={hrm.zoneSeconds}
              sessionActive={hrm.sessionActive}
              sessionSamples={hrm.sessionSamples}
            />
          )}
        </div>
      )}
    </Card>
  )
}
