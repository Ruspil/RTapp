import { useState } from 'react'
import {
  ChevronLeft,
  Heart,
  Bluetooth,
  BluetoothOff,
  BluetoothSearching,
  Play,
  Square,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useHeartRateMonitor } from '@/hooks/useHeartRateMonitor'
import {
  calculateMaxHR,
  calculateAverageBPM,
  saveSession,
  HR_ZONES,
  type HRSession,
} from '@/lib/heartRateUtils'
import { BPMChart } from '@/components/BPMChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { ZoneSeconds } from '@/hooks/useHeartRateMonitor'

interface HeartRateMonitorProps {
  onBack: () => void
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')}`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    idle: { label: 'Not connected', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    scanning: { label: 'Searching...', className: 'bg-blue-950 text-blue-300 border-blue-800' },
    connecting: {
      label: 'Connecting...',
      className: 'bg-yellow-950 text-yellow-300 border-yellow-800',
    },
    connected: { label: 'Connected', className: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
    disconnected: { label: 'Disconnected', className: 'bg-red-950 text-red-300 border-red-800' },
    error: { label: 'Error', className: 'bg-red-950 text-red-300 border-red-800' },
    unsupported: {
      label: 'Not supported',
      className: 'bg-amber-950 text-amber-300 border-amber-800',
    },
  }
  const info = map[status] ?? map['idle']
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        info.className
      )}
    >
      {info.label}
    </span>
  )
}

export function HeartRateMonitor({ onBack }: HeartRateMonitorProps) {
  const [age, setAge] = useState<number | null>(() => {
    const stored = localStorage.getItem('userAge')
    return stored ? parseInt(stored) : null
  })
  const [showAgeModal, setShowAgeModal] = useState(false)
  const [ageInput, setAgeInput] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [savedSamples, setSavedSamples] = useState<any[]>([])
  const [savedAvgBPM, setSavedAvgBPM] = useState(0)
  const [savedDuration, setSavedDuration] = useState(0)
  const [savedZoneSeconds, setSavedZoneSeconds] = useState<ZoneSeconds>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })

  const maxHR = age ? calculateMaxHR(age) : 200
  const hrm = useHeartRateMonitor(maxHR)

  const isUnsupported = hrm.status === 'unsupported'

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
      localStorage.setItem('userAge', String(parsed))
      setShowAgeModal(false)
      setAgeInput('')
      hrm.connect()
    }
  }

  const handleStopSession = async () => {
    const { sessionSamples, zoneSeconds } = hrm
    hrm.stopSession()

    if (sessionSamples.length > 0) {
      const avgBPM = calculateAverageBPM(sessionSamples)
      const duration =
        (sessionSamples[sessionSamples.length - 1].timestamp - sessionSamples[0].timestamp) / 1000

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
          deviceName: hrm.deviceName ?? 'Unknown',
          samples: sessionSamples,
          maxHR,
          age,
        }
        try {
          await saveSession(session)
        } catch (e) {
          console.error('Failed to save session:', e)
        }
      }
    }
  }

  const currentZoneInfo = hrm.currentZone
    ? HR_ZONES[hrm.currentZone as keyof typeof HR_ZONES]
    : null

  return (
    <div className="min-h-svh bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 text-white">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Heart className="size-5 text-red-500 fill-red-500" />
            <h1 className="font-black text-lg tracking-tight">Heart Rate Monitor</h1>
          </div>
          <StatusBadge status={hrm.status} />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Unsupported Browser Warning */}
        {isUnsupported && (
          <Card className="bg-amber-950/40 border-amber-800">
            <CardContent className="p-4 flex gap-3">
              <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300 text-sm mb-1">
                  Web Bluetooth Required
                </p>
                <p className="text-xs text-amber-400/80">
                  Use Chrome, Edge, Brave, or on iOS the Bluefy browser to connect a heart rate
                  monitor.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BPM Display */}
        <Card
          className="bg-zinc-900 border-zinc-800 overflow-hidden"
          style={
            currentZoneInfo
              ? { borderColor: currentZoneInfo.color + '60', boxShadow: `0 0 30px ${currentZoneInfo.color}18` }
              : {}
          }
        >
          <CardContent className="p-8 text-center">
            <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">
              Heart Rate
            </p>
            <div
              className="font-black tabular-nums leading-none mb-2 transition-colors duration-500"
              style={{
                fontSize: 'clamp(72px, 20vw, 120px)',
                color: currentZoneInfo?.color ?? '#ffffff',
              }}
            >
              {hrm.currentBPM ?? '--'}
            </div>
            <p className="text-sm text-zinc-400 mb-4">BPM</p>

            {currentZoneInfo ? (
              <div
                className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border"
                style={{
                  backgroundColor: currentZoneInfo.color + '20',
                  borderColor: currentZoneInfo.color + '60',
                  color: currentZoneInfo.color,
                }}
              >
                Zone {hrm.currentZone} · {currentZoneInfo.name}
              </div>
            ) : (
              <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
                {hrm.isConnected ? 'Waiting for signal...' : 'Not connected'}
              </div>
            )}

            {hrm.isConnected && (
              <p className="text-xs text-zinc-500 mt-3">Max HR: {maxHR} bpm</p>
            )}
          </CardContent>
        </Card>

        {/* Connection Controls */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 space-y-3">
            {hrm.deviceName && (
              <div className="flex items-center gap-2 text-sm">
                <Bluetooth className="size-4 text-blue-400" />
                <span className="text-zinc-300 font-medium">{hrm.deviceName}</span>
              </div>
            )}

            {hrm.error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-3 py-2">
                {hrm.error}
              </p>
            )}

            <div className="flex gap-2">
              {!hrm.isConnected && hrm.status !== 'scanning' && hrm.status !== 'connecting' ? (
                <Button
                  onClick={handleConnectClick}
                  disabled={isUnsupported}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
                >
                  <BluetoothSearching className="size-4 mr-2" />
                  Connect Heart Rate Monitor
                </Button>
              ) : hrm.status === 'scanning' || hrm.status === 'connecting' ? (
                <Button disabled className="flex-1 bg-zinc-800 text-zinc-400 h-11 cursor-not-allowed">
                  <BluetoothSearching className="size-4 mr-2 animate-pulse" />
                  {hrm.status === 'scanning' ? 'Searching for devices...' : `Connecting to ${hrm.deviceName ?? 'device'}...`}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={hrm.disconnect}
                    variant="outline"
                    className="flex-1 border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 h-11"
                  >
                    <BluetoothOff className="size-4 mr-2" />
                    Disconnect
                  </Button>
                  {hrm.status === 'disconnected' && (
                    <Button
                      onClick={hrm.reconnect}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-11"
                    >
                      <RefreshCw className="size-4 mr-2" />
                      Reconnect
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Session Controls */}
        {hrm.isConnected && (
          <div className="flex gap-2">
            <Button
              onClick={hrm.startSession}
              disabled={hrm.sessionActive}
              className={cn(
                'flex-1 h-12 font-bold',
                hrm.sessionActive
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              <Play className="size-4 mr-2" />
              Start Session
            </Button>
            <Button
              onClick={handleStopSession}
              disabled={!hrm.sessionActive}
              className={cn(
                'flex-1 h-12 font-bold',
                !hrm.sessionActive
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              <Square className="size-4 mr-2" />
              Stop Session
            </Button>
          </div>
        )}

        {/* Live Zone Timers (during session) */}
        {hrm.sessionActive && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                Live Zone Time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
              {Object.entries(HR_ZONES).map(([zoneNum, zoneInfo]) => {
                const z = parseInt(zoneNum) as keyof typeof hrm.zoneSeconds
                const secs = hrm.zoneSeconds[z] ?? 0
                const isCurrentZone = hrm.currentZone === parseInt(zoneNum)
                return (
                  <div
                    key={zoneNum}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2 transition-colors',
                      isCurrentZone ? 'bg-zinc-800' : 'bg-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: zoneInfo.color }}
                      />
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          isCurrentZone ? 'text-white' : 'text-zinc-500'
                        )}
                      >
                        Z{zoneNum} · {zoneInfo.name}
                      </span>
                      {isCurrentZone && (
                        <span className="text-xs text-zinc-400">← now</span>
                      )}
                    </div>
                    <span
                      className="text-sm font-black tabular-nums"
                      style={{ color: isCurrentZone ? zoneInfo.color : '#52525b' }}
                    >
                      {formatSeconds(secs)}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Age Modal */}
      <Dialog open={showAgeModal} onOpenChange={setShowAgeModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Your Age</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            We need your age to calculate your heart rate zones (MaxHR = 220 − age).
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block">
                Age
              </Label>
              <Input
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 28"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAgeSubmit()}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 h-12 text-lg"
                autoFocus
              />
            </div>
            <Button
              onClick={handleAgeSubmit}
              disabled={!ageInput || parseInt(ageInput) <= 0 || parseInt(ageInput) >= 120}
              className="w-full h-12 bg-red-600 hover:bg-red-700 font-bold"
            >
              Connect Monitor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Summary Modal */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Heart className="size-5 text-red-500 fill-red-500" />
              Session Summary
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Avg BPM</p>
                <p className="text-3xl font-black text-white">{savedAvgBPM}</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1">Duration</p>
                <p className="text-3xl font-black text-white">
                  {Math.floor(savedDuration / 60)}:{String(Math.floor(savedDuration % 60)).padStart(2, '0')}
                </p>
              </div>
            </div>

            {/* Chart */}
            {savedSamples.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                  Heart Rate Trend
                </p>
                <BPMChart samples={savedSamples} maxHR={maxHR} />
              </div>
            )}

            <Separator className="bg-zinc-800" />

            {/* Zone breakdown */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                Time in Zones
              </p>
              <div className="space-y-2">
                {Object.entries(HR_ZONES).map(([zoneNum, zoneInfo]) => {
                  const secs = savedZoneSeconds[parseInt(zoneNum) as keyof ZoneSeconds] ?? 0
                  return (
                    <div key={zoneNum} className="flex items-center gap-3">
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: zoneInfo.color }}
                      />
                      <span className="text-sm text-zinc-300 flex-1">
                        Z{zoneNum} {zoneInfo.name}
                      </span>
                      <span
                        className="text-sm font-black tabular-nums"
                        style={{ color: zoneInfo.color }}
                      >
                        {formatSeconds(secs)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <Button
              onClick={() => setShowSummary(false)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
