import { useState, useEffect, useCallback, useRef } from 'react'
import { parseHeartRateValue, getZone, type HRSample } from '@/lib/heartRateUtils'

export type HRMStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'unsupported'

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
  // Session
  sessionActive: boolean
  sessionSamples: HRSample[]
  zoneSeconds: ZoneSeconds
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  startSession: () => void
  stopSession: () => void
}

const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb'
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb'

export function useHeartRateMonitor(maxHR: number): UseHeartRateMonitorReturn {
  const [status, setStatus] = useState<HRMStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.bluetooth ? 'unsupported' : 'idle'
  )
  const [isConnected, setIsConnected] = useState(false)
  const [currentBPM, setCurrentBPM] = useState<number | null>(null)
  const [currentZone, setCurrentZone] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)

  const [sessionActive, setSessionActive] = useState(false)
  const [sessionSamples, setSessionSamples] = useState<HRSample[]>([])
  const [zoneSeconds, setZoneSeconds] = useState<ZoneSeconds>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })

  const deviceRef = useRef<BluetoothDevice | null>(null)
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentBPMRef = useRef<number | null>(null)
  const currentZoneRef = useRef<number | null>(null)
  const sessionActiveRef = useRef(false)

  // Keep refs in sync
  useEffect(() => {
    currentBPMRef.current = currentBPM
  }, [currentBPM])

  useEffect(() => {
    currentZoneRef.current = currentZone
  }, [currentZone])

  useEffect(() => {
    sessionActiveRef.current = sessionActive
  }, [sessionActive])

  const handleHeartRateChange = useCallback(
    (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic
      const value = target.value
      if (!value) return

      try {
        const bpm = parseHeartRateValue(value)
        const zone = getZone(bpm, maxHR)
        setCurrentBPM(bpm)
        setCurrentZone(zone)
        currentBPMRef.current = bpm
        currentZoneRef.current = zone

        if (staleTimerRef.current) clearTimeout(staleTimerRef.current)
        staleTimerRef.current = setTimeout(() => {
          setCurrentBPM(null)
          currentBPMRef.current = null
        }, 4000)
      } catch (err) {
        console.error('Error parsing heart rate value:', err)
      }
    },
    [maxHR]
  )

  const attachCharacteristic = useCallback(
    async (characteristic: BluetoothRemoteGATTCharacteristic) => {
      characteristicRef.current = characteristic
      await characteristic.startNotifications()
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateChange)
    },
    [handleHeartRateChange]
  )

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setStatus('unsupported')
      setError('Web Bluetooth is not supported. Use Chrome, Edge, Brave, or Bluefy on iOS.')
      return
    }

    try {
      setStatus('scanning')
      setError(null)

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: ['generic_access'],
      })

      setDeviceName(device.name ?? 'Unknown Device')
      setStatus('connecting')

      const gatt = await device.gatt?.connect()
      if (!gatt) throw new Error('Failed to connect to GATT server')

      const service = await gatt.getPrimaryService(HEART_RATE_SERVICE)
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)

      await attachCharacteristic(characteristic)
      deviceRef.current = device

      setIsConnected(true)
      setStatus('connected')

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false)
        setCurrentBPM(null)
        currentBPMRef.current = null
        setStatus('disconnected')
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'NotFoundError') {
        // User cancelled device picker
        setStatus('idle')
        setError(null)
      } else {
        const msg = err instanceof Error ? err.message : 'Connection failed'
        setError(msg)
        setStatus('error')
      }
      setIsConnected(false)
    }
  }, [attachCharacteristic])

  const reconnect = useCallback(async () => {
    const device = deviceRef.current
    if (!device) {
      await connect()
      return
    }

    try {
      setStatus('connecting')
      setError(null)
      const gatt = await device.gatt?.connect()
      if (!gatt) throw new Error('Failed to reconnect to GATT server')

      const service = await gatt.getPrimaryService(HEART_RATE_SERVICE)
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT)

      await attachCharacteristic(characteristic)
      setIsConnected(true)
      setStatus('connected')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reconnection failed'
      setError(msg)
      setStatus('error')
    }
  }, [connect, attachCharacteristic])

  const disconnect = useCallback(() => {
    if (characteristicRef.current) {
      characteristicRef.current.removeEventListener(
        'characteristicvaluechanged',
        handleHeartRateChange
      )
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect()
    }
    setIsConnected(false)
    setCurrentBPM(null)
    setCurrentZone(null)
    setStatus('disconnected')
  }, [handleHeartRateChange])

  const startSession = useCallback(() => {
    setSessionSamples([])
    setZoneSeconds({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    setSessionActive(true)
    sessionActiveRef.current = true

    sessionIntervalRef.current = setInterval(() => {
      if (!sessionActiveRef.current) return
      const bpm = currentBPMRef.current
      const zone = currentZoneRef.current
      if (bpm !== null && zone !== null) {
        const sample: HRSample = { timestamp: Date.now(), bpm, zone }
        setSessionSamples((prev) => [...prev, sample])
        setZoneSeconds((prev) => ({
          ...prev,
          [zone]: (prev[zone as keyof ZoneSeconds] ?? 0) + 1,
        }))
      }
    }, 1000)
  }, [])

  const stopSession = useCallback(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current)
      sessionIntervalRef.current = null
    }
    setSessionActive(false)
    sessionActiveRef.current = false
  }, [])

  useEffect(() => {
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current)
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
      if (characteristicRef.current) {
        characteristicRef.current.removeEventListener(
          'characteristicvaluechanged',
          handleHeartRateChange
        )
      }
    }
  }, [handleHeartRateChange])

  return {
    isConnected,
    currentBPM,
    currentZone,
    status,
    error,
    deviceName,
    sessionActive,
    sessionSamples,
    zoneSeconds,
    connect,
    disconnect,
    reconnect,
    startSession,
    stopSession,
  }
}
