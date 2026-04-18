import { useEffect, useMemo, useSyncExternalStore } from "react"
import { getZone, type HRSample } from "@/lib/heartRateUtils"

/**
 * Helio Strap — singleton Web Bluetooth Heart Rate client.
 *
 * One GATT connection is shared across the whole app (ProgramHome FreshnessCard,
 * ActiveWorkout HRMWidget, SetEffortFeedback, CardioZoneFeedback).
 *
 * Exposes:
 *  - live BPM / zone (shared with UI via `useHelioStrap` hook)
 *  - HR session (sample log + time-in-zone)
 *  - HRV recording session (collects RR intervals, computes RMSSD)
 */

const HEART_RATE_SERVICE = "0000180d-0000-1000-8000-00805f9b34fb"
const HEART_RATE_MEASUREMENT = "00002a37-0000-1000-8000-00805f9b34fb"

export type HelioStatus =
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

export interface HelioState {
  status: HelioStatus
  isConnected: boolean
  currentBPM: number | null
  currentZone: number | null
  error: string | null
  deviceName: string | null
  sessionActive: boolean
  sessionSamples: HRSample[]
  zoneSeconds: ZoneSeconds
  hrvRecording: boolean
  hrvProgress: number
}

function defaultState(): HelioState {
  const supported = typeof navigator !== "undefined" && !!navigator.bluetooth
  return {
    status: supported ? "idle" : "unsupported",
    isConnected: false,
    currentBPM: null,
    currentZone: null,
    error: null,
    deviceName: null,
    sessionActive: false,
    sessionSamples: [],
    zoneSeconds: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    hrvRecording: false,
    hrvProgress: 0,
  }
}

class HelioStrap extends EventTarget {
  private state: HelioState = defaultState()
  private device: BluetoothDevice | null = null
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null
  private staleTimer: ReturnType<typeof setTimeout> | null = null
  private sessionInterval: ReturnType<typeof setInterval> | null = null
  private hrvRrSink: ((rr: number[]) => void) | null = null
  private maxHR = 190

  getState(): HelioState {
    return this.state
  }

  isSupported(): boolean {
    return this.state.status !== "unsupported"
  }

  setMaxHR(maxHR: number) {
    if (!Number.isFinite(maxHR) || maxHR <= 0) return
    this.maxHR = maxHR
    if (this.state.currentBPM != null) {
      const zone = getZone(this.state.currentBPM, maxHR)
      if (zone !== this.state.currentZone) this.patch({ currentZone: zone })
    }
  }

  private patch(p: Partial<HelioState>) {
    this.state = { ...this.state, ...p }
    this.dispatchEvent(new Event("change"))
  }

  private onCharacteristicValue = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value
    if (!value) return
    const parsed = parseHeartRateMeasurement(value)
    const zone = getZone(parsed.bpm, this.maxHR)
    if (this.staleTimer) clearTimeout(this.staleTimer)
    this.staleTimer = setTimeout(() => {
      this.patch({ currentBPM: null })
    }, 4000)
    this.patch({ currentBPM: parsed.bpm, currentZone: zone })
    if (this.hrvRrSink && parsed.rrIntervals.length > 0) {
      this.hrvRrSink(parsed.rrIntervals)
    }
  }

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      this.patch({ status: "unsupported", error: "Web Bluetooth not supported on this browser." })
      return
    }
    // Single GATT session app-wide (Freshness HRV, Heart Rate page, workouts). If already
    // connected, do not open the device picker again.
    if (this.device?.gatt?.connected && this.characteristic) {
      this.patch({
        isConnected: true,
        status: "connected",
        error: null,
        deviceName: this.device.name ?? this.state.deviceName ?? "Helio Strap",
      })
      return
    }
    try {
      this.patch({ status: "scanning", error: null })
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: ["generic_access"],
      })
      this.patch({ deviceName: device.name ?? "Helio Strap", status: "connecting" })

      const gatt = await device.gatt?.connect()
      if (!gatt) throw new Error("Failed to connect to GATT")
      const service = await gatt.getPrimaryService(HEART_RATE_SERVICE)
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
      await characteristic.startNotifications()
      characteristic.addEventListener("characteristicvaluechanged", this.onCharacteristicValue)

      this.device = device
      this.characteristic = characteristic

      device.addEventListener("gattserverdisconnected", () => {
        this.patch({ isConnected: false, currentBPM: null, currentZone: null, status: "disconnected" })
      })

      this.patch({ isConnected: true, status: "connected" })
    } catch (err) {
      if (err instanceof Error && err.name === "NotFoundError") {
        this.patch({ status: "idle", error: null })
      } else {
        this.patch({
          status: "error",
          error: err instanceof Error ? err.message : "Connection failed",
          isConnected: false,
        })
      }
    }
  }

  async reconnect(): Promise<void> {
    if (!this.device) {
      await this.connect()
      return
    }
    try {
      this.patch({ status: "connecting", error: null })
      const gatt = await this.device.gatt?.connect()
      if (!gatt) throw new Error("Failed to reconnect")
      const service = await gatt.getPrimaryService(HEART_RATE_SERVICE)
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)
      await characteristic.startNotifications()
      characteristic.addEventListener("characteristicvaluechanged", this.onCharacteristicValue)
      this.characteristic = characteristic
      this.patch({ isConnected: true, status: "connected" })
    } catch (err) {
      this.patch({
        status: "error",
        error: err instanceof Error ? err.message : "Reconnection failed",
      })
    }
  }

  disconnect(): void {
    if (this.characteristic) {
      try {
        this.characteristic.removeEventListener(
          "characteristicvaluechanged",
          this.onCharacteristicValue,
        )
      } catch {
        /* ignore */
      }
    }
    if (this.device?.gatt?.connected) {
      try {
        this.device.gatt.disconnect()
      } catch {
        /* ignore */
      }
    }
    this.patch({
      isConnected: false,
      currentBPM: null,
      currentZone: null,
      status: "disconnected",
    })
  }

  startSession(): void {
    if (this.sessionInterval) clearInterval(this.sessionInterval)
    this.patch({
      sessionActive: true,
      sessionSamples: [],
      zoneSeconds: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
    this.sessionInterval = setInterval(() => {
      if (!this.state.sessionActive) return
      const bpm = this.state.currentBPM
      const zone = this.state.currentZone
      if (bpm != null && zone != null) {
        const sample: HRSample = { timestamp: Date.now(), bpm, zone }
        const nextSamples = [...this.state.sessionSamples, sample]
        const nextZoneSeconds = { ...this.state.zoneSeconds }
        nextZoneSeconds[zone as keyof ZoneSeconds] =
          (nextZoneSeconds[zone as keyof ZoneSeconds] ?? 0) + 1
        this.patch({ sessionSamples: nextSamples, zoneSeconds: nextZoneSeconds })
      }
    }, 1000)
  }

  stopSession(): void {
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval)
      this.sessionInterval = null
    }
    this.patch({ sessionActive: false })
  }

  /**
   * Record a short HRV measurement window, collecting RR intervals from the strap,
   * and return the RMSSD (ms). Requires the strap to be already connected.
   */
  recordHrvSession(durationSec = 120): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.state.isConnected) {
        reject(new Error("Helio Strap not connected"))
        return
      }
      const rrAll: number[] = []
      this.hrvRrSink = (rr) => {
        rrAll.push(...rr)
      }
      const startedAt = Date.now()
      this.patch({ hrvRecording: true, hrvProgress: 0 })

      const tick = setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000
        const progress = Math.min(1, elapsed / durationSec)
        this.patch({ hrvProgress: progress })
        if (progress >= 1) {
          clearInterval(tick)
          this.hrvRrSink = null
          this.patch({ hrvRecording: false, hrvProgress: 1 })
          if (rrAll.length < 10) {
            reject(new Error("Pas assez d'intervalles RR — vérifie le capteur"))
            return
          }
          const rmssd = calcRmssd(rrAll)
          if (rmssd <= 0) {
            reject(new Error("HRV non calculable — réessaie en restant calme"))
            return
          }
          resolve(Math.round(rmssd))
        }
      }, 250)

      // Abort if no RR arrives at all within 20s
      setTimeout(() => {
        if (this.state.hrvRecording && rrAll.length < 3) {
          clearInterval(tick)
          this.hrvRrSink = null
          this.patch({ hrvRecording: false, hrvProgress: 0 })
          reject(new Error("Aucun intervalle RR détecté — le strap supporte-t-il le RR ?"))
        }
      }, 20000)
    })
  }
}

export const helioStrap = new HelioStrap()

/** Stable subscribe + getSnapshot for useSyncExternalStore. */
function subscribeHelio(cb: () => void): () => void {
  helioStrap.addEventListener("change", cb)
  return () => helioStrap.removeEventListener("change", cb)
}
function getHelioSnapshot(): HelioState {
  return helioStrap.getState()
}

/** Stable action object — bound once so consumers never see a new reference. */
const helioActions = {
  connect: () => helioStrap.connect(),
  disconnect: () => helioStrap.disconnect(),
  reconnect: () => helioStrap.reconnect(),
  startSession: () => helioStrap.startSession(),
  stopSession: () => helioStrap.stopSession(),
  recordHrvSession: (d?: number) => helioStrap.recordHrvSession(d),
} as const

/**
 * Subscribe to a SLICE of the Helio store. Only re-renders when the selected
 * value changes (using `Object.is`). Use this in hot components that only need
 * one field (e.g. just `currentBPM` or `isConnected`) to avoid waking up the
 * whole UI on every BPM tick.
 */
export function useHelioSelector<T>(selector: (state: HelioState) => T): T {
  return useSyncExternalStore(
    subscribeHelio,
    () => selector(helioStrap.getState()),
    () => selector(helioStrap.getState()),
  )
}

export function useHelioStrap(maxHR?: number): HelioState & {
  supported: boolean
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  startSession: () => void
  stopSession: () => void
  recordHrvSession: (durationSec?: number) => Promise<number>
} {
  const state = useSyncExternalStore(subscribeHelio, getHelioSnapshot, getHelioSnapshot)

  useEffect(() => {
    if (maxHR) helioStrap.setMaxHR(maxHR)
  }, [maxHR])

  // Memoize the merged result so identity is stable when state didn't change.
  return useMemo(
    () => ({
      ...state,
      supported: helioStrap.isSupported(),
      ...helioActions,
    }),
    [state],
  )
}

/* --------------------------- parsing & math ------------------------------ */

export function parseHeartRateMeasurement(value: DataView): {
  bpm: number
  rrIntervals: number[]
} {
  const flags = value.getUint8(0)
  const is16 = (flags & 0x01) !== 0
  const eePresent = (flags & 0x08) !== 0
  const rrPresent = (flags & 0x10) !== 0
  let idx = 1
  let bpm: number
  if (is16) {
    bpm = value.getUint16(idx, true)
    idx += 2
  } else {
    bpm = value.getUint8(idx)
    idx += 1
  }
  if (eePresent) idx += 2
  const rrIntervals: number[] = []
  if (rrPresent) {
    while (idx + 1 < value.byteLength) {
      const rrRaw = value.getUint16(idx, true)
      // RR intervals are in 1/1024 s units
      rrIntervals.push((rrRaw / 1024) * 1000)
      idx += 2
    }
  }
  return { bpm, rrIntervals }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

export function calcRmssd(rrIntervals: number[]): number {
  if (rrIntervals.length < 5) return 0
  const med = median(rrIntervals)
  const lo = med * 0.7
  const hi = med * 1.3
  const filtered = rrIntervals.filter((r) => r > 300 && r < 2000 && r >= lo && r <= hi)
  if (filtered.length < 5) return 0
  let sumSq = 0
  let n = 0
  for (let i = 1; i < filtered.length; i++) {
    const diff = filtered[i] - filtered[i - 1]
    sumSq += diff * diff
    n++
  }
  if (n === 0) return 0
  return Math.sqrt(sumSq / n)
}

/* --------------------------- HRV storage --------------------------------- */

const HRV_TODAY_KEY = "trainhard-hrv-today"

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function saveTodaysHrv(ms: number): void {
  try {
    localStorage.setItem(HRV_TODAY_KEY, JSON.stringify({ date: todayKey(), hrv: ms }))
  } catch {
    /* ignore */
  }
}

export function getTodaysHrv(): number | null {
  try {
    const raw = localStorage.getItem(HRV_TODAY_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as { date: string; hrv: number }
    if (obj.date !== todayKey()) return null
    return obj.hrv
  } catch {
    return null
  }
}

const HRV_HISTORY_KEY = "trainhard-hrv-history"

export interface HrvHistoryEntry {
  date: string
  hrv: number
}

export function appendHrvHistory(ms: number): void {
  try {
    const raw = localStorage.getItem(HRV_HISTORY_KEY)
    const arr: HrvHistoryEntry[] = raw ? (JSON.parse(raw) as HrvHistoryEntry[]) : []
    const today = todayKey()
    const next = arr.filter((e) => e.date !== today)
    next.push({ date: today, hrv: ms })
    localStorage.setItem(HRV_HISTORY_KEY, JSON.stringify(next.slice(-60)))
  } catch {
    /* ignore */
  }
}

export function getHrvHistory(): HrvHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HRV_HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HrvHistoryEntry[]) : []
  } catch {
    return []
  }
}

export function getHrv7dAverage(): number | null {
  const hist = getHrvHistory()
  if (hist.length === 0) return null
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = hist.filter((e) => new Date(e.date).getTime() >= cutoff)
  if (recent.length === 0) return null
  const sum = recent.reduce((acc, e) => acc + e.hrv, 0)
  return sum / recent.length
}
