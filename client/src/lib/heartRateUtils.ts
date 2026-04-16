// Heart Rate Monitoring Utilities

export interface HRSample {
  timestamp: number
  bpm: number
  zone: number
}

export interface HRSession {
  id: string
  startTime: number
  endTime?: number
  deviceName: string
  samples: HRSample[]
  maxHR: number
  age: number
}

export const HR_ZONES = {
  1: { name: 'Warm-up', min: 0.5, max: 0.6, color: '#60a5fa' },
  2: { name: 'Fat Burn', min: 0.6, max: 0.7, color: '#34d399' },
  3: { name: 'Aerobic', min: 0.7, max: 0.8, color: '#fbbf24' },
  4: { name: 'Anaerobic', min: 0.8, max: 0.9, color: '#f97316' },
  5: { name: 'Max Effort', min: 0.9, max: 1.0, color: '#ef4444' },
}

export function calculateMaxHR(age: number): number {
  return 220 - age
}

export function getZone(bpm: number, maxHR: number): number {
  const percentage = bpm / maxHR
  if (percentage < 0.6) return 1
  if (percentage < 0.7) return 2
  if (percentage < 0.8) return 3
  if (percentage < 0.9) return 4
  return 5
}

export function parseHeartRateValue(value: DataView): number {
  const flags = value.getUint8(0)
  const rate16Bit = (flags & 0x1) !== 0
  
  if (rate16Bit) {
    return value.getUint16(1, true)
  } else {
    return value.getUint8(1)
  }
}

export function calculateZoneTimings(samples: HRSample[]): Record<number, number> {
  const timings: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  
  for (let i = 0; i < samples.length - 1; i++) {
    const zone = samples[i].zone
    const timeDiff = (samples[i + 1].timestamp - samples[i].timestamp) / 1000
    timings[zone] += timeDiff
  }
  
  return timings
}

export function calculateAverageBPM(samples: HRSample[]): number {
  if (samples.length === 0) return 0
  const sum = samples.reduce((acc, s) => acc + s.bpm, 0)
  return Math.round(sum / samples.length)
}

export async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hrmSessions', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' })
      }
    }
  })
}

export async function saveSession(session: HRSession): Promise<void> {
  const db = await initIndexedDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readwrite')
    const store = transaction.objectStore('sessions')
    const request = store.add(session)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getSessions(): Promise<HRSession[]> {
  const db = await initIndexedDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readonly')
    const store = transaction.objectStore('sessions')
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}
