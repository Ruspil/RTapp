import type { HRSample } from "@/lib/heartRateUtils"
import { useHelioStrap } from "@/lib/helioStrap"

export type HRMStatus =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "unsupported"

export interface ZoneSeconds {
  1: number
  2: number
  3: number
  4: number
  5: number
}

export interface UseHeartRateMonitorReturn {
  isConnected: boolean
  currentBPM: number | null
  currentZone: number | null
  status: HRMStatus
  error: string | null
  deviceName: string | null
  sessionActive: boolean
  sessionSamples: HRSample[]
  zoneSeconds: ZoneSeconds
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  startSession: () => void
  stopSession: () => void
}

/**
 * Thin adapter that exposes the shared Helio Strap singleton under the same
 * API the existing HRMWidget / HeartRateMonitor page expect.
 */
export function useHeartRateMonitor(maxHR: number): UseHeartRateMonitorReturn {
  const s = useHelioStrap(maxHR)
  return {
    isConnected: s.isConnected,
    currentBPM: s.currentBPM,
    currentZone: s.currentZone,
    status: s.status,
    error: s.error,
    deviceName: s.deviceName,
    sessionActive: s.sessionActive,
    sessionSamples: s.sessionSamples,
    zoneSeconds: s.zoneSeconds,
    connect: s.connect,
    disconnect: s.disconnect,
    reconnect: s.reconnect,
    startSession: s.startSession,
    stopSession: s.stopSession,
  }
}
