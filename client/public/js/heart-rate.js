/**
 * HeartRateMonitor - Web Bluetooth Heart Rate Monitoring Module
 * Handles BLE connection, BPM parsing, zone calculation, and session management
 */

class HeartRateMonitor {
  constructor() {
    this.device = null
    this.server = null
    this.characteristic = null
    this.currentBPM = null
    this.currentZone = null
    this.maxHR = 200
    this.isConnected = false
    this.sessionActive = false
    this.sessionData = []
    this.zoneTimers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    this.lastZoneTime = Date.now()
    this.listeners = {}
    
    this.HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb'
    this.HEART_RATE_CHARACTERISTIC = '00002a37-0000-1000-8000-00805f9b34fb'
    
    this.ZONES = {
      1: { min: 0.5, max: 0.6, name: 'Zone 1', color: '#3b82f6' },
      2: { min: 0.6, max: 0.7, name: 'Zone 2', color: '#10b981' },
      3: { min: 0.7, max: 0.8, name: 'Zone 3', color: '#f59e0b' },
      4: { min: 0.8, max: 0.9, name: 'Zone 4', color: '#f97316' },
      5: { min: 0.9, max: 1.0, name: 'Zone 5', color: '#ef4444' },
    }
    
    this.loadUserAge()
  }

  loadUserAge() {
    const age = localStorage.getItem('hrm_user_age')
    if (age) {
      this.setUserAge(parseInt(age))
    }
  }

  setUserAge(age) {
    if (age > 0 && age < 120) {
      this.maxHR = 220 - age
      localStorage.setItem('hrm_user_age', age.toString())
      this.emit('ageSet', { age, maxHR: this.maxHR })
    }
  }

  async connect() {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth not supported')
      }

      this.emit('connecting')

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.HEART_RATE_SERVICE] }],
        optionalServices: [],
      })

      this.device.addEventListener('gattserverdisconnected', () => this.handleDisconnect())

      this.server = await this.device.gatt.connect()
      const service = await this.server.getPrimaryService(this.HEART_RATE_SERVICE)
      this.characteristic = await service.getCharacteristic(this.HEART_RATE_CHARACTERISTIC)

      await this.characteristic.startNotifications()
      this.characteristic.addEventListener('characteristicvaluechanged', (e) => this.handleBPMUpdate(e))

      this.isConnected = true
      this.emit('connected', { deviceName: this.device.name })
    } catch (error) {
      this.emit('error', { message: error.message })
      this.isConnected = false
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect()
    }
    this.isConnected = false
    this.emit('disconnected')
  }

  async reconnect() {
    if (this.device) {
      try {
        this.server = await this.device.gatt.connect()
        const service = await this.server.getPrimaryService(this.HEART_RATE_SERVICE)
        this.characteristic = await service.getCharacteristic(this.HEART_RATE_CHARACTERISTIC)
        await this.characteristic.startNotifications()
        this.characteristic.addEventListener('characteristicvaluechanged', (e) => this.handleBPMUpdate(e))
        this.isConnected = true
        this.emit('connected', { deviceName: this.device.name })
      } catch (error) {
        this.emit('error', { message: error.message })
      }
    }
  }

  handleBPMUpdate(event) {
    const value = event.target.value
    const bpm = this.parseHeartRateMeasurement(value)
    
    if (bpm !== null) {
      this.currentBPM = bpm
      this.currentZone = this.calculateZone(bpm)
      
      if (this.sessionActive) {
        this.recordSample(bpm)
        this.updateZoneTimer()
      }
      
      this.emit('bpmUpdate', { bpm, zone: this.currentZone })
    }
  }

  parseHeartRateMeasurement(dataView) {
    const flags = dataView.getUint8(0)
    const bpm16BitFlag = flags & 0x01
    
    if (bpm16BitFlag) {
      return dataView.getUint16(1, true)
    } else {
      return dataView.getUint8(1)
    }
  }

  calculateZone(bpm) {
    const percentage = bpm / this.maxHR
    
    for (const [zoneNum, zoneData] of Object.entries(this.ZONES)) {
      if (percentage >= zoneData.min && percentage <= zoneData.max) {
        return parseInt(zoneNum)
      }
    }
    
    return bpm > this.maxHR ? 5 : 1
  }

  startSession() {
    this.sessionActive = true
    this.sessionData = []
    this.zoneTimers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    this.lastZoneTime = Date.now()
    this.emit('sessionStarted')
  }

  stopSession() {
    this.sessionActive = false
    const summary = this.generateSessionSummary()
    this.saveSession(summary)
    this.emit('sessionStopped', summary)
    return summary
  }

  recordSample(bpm) {
    this.sessionData.push({
      timestamp: Date.now(),
      bpm,
      zone: this.currentZone,
    })
  }

  updateZoneTimer() {
    const now = Date.now()
    const elapsed = (now - this.lastZoneTime) / 1000
    
    if (this.currentZone && this.zoneTimers[this.currentZone] !== undefined) {
      this.zoneTimers[this.currentZone] += elapsed
    }
    
    this.lastZoneTime = now
  }

  generateSessionSummary() {
    if (this.sessionData.length === 0) {
      return null
    }

    const avgBPM = Math.round(
      this.sessionData.reduce((sum, s) => sum + s.bpm, 0) / this.sessionData.length
    )
    
    const duration = (this.sessionData[this.sessionData.length - 1].timestamp - this.sessionData[0].timestamp) / 1000
    
    return {
      id: `session-${Date.now()}`,
      startTime: this.sessionData[0].timestamp,
      endTime: this.sessionData[this.sessionData.length - 1].timestamp,
      deviceName: this.device?.name || 'Unknown',
      avgBPM,
      maxBPM: Math.max(...this.sessionData.map(s => s.bpm)),
      minBPM: Math.min(...this.sessionData.map(s => s.bpm)),
      duration,
      zoneTimers: { ...this.zoneTimers },
      samples: this.sessionData,
      maxHR: this.maxHR,
    }
  }

  async saveSession(summary) {
    try {
      const db = await this.openDB()
      const tx = db.transaction(['hrmSessions'], 'readwrite')
      const store = tx.objectStore('hrmSessions')
      await store.add(summary)
      this.emit('sessionSaved', summary)
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TrainingAppDB', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('hrmSessions')) {
          db.createObjectStore('hrmSessions', { keyPath: 'id' })
        }
      }
    })
  }

  async getSessions() {
    try {
      const db = await this.openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['hrmSessions'], 'readonly')
        const store = tx.objectStore('hrmSessions')
        const request = store.getAll()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
      })
    } catch (error) {
      console.error('Failed to get sessions:', error)
      return []
    }
  }

  handleDisconnect() {
    this.isConnected = false
    this.emit('disconnected')
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
    }
  }

  emit(event, data = {}) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }

  getCurrentBPM() {
    return this.currentBPM
  }

  getCurrentZone() {
    return this.currentZone
  }

  getZoneData() {
    return this.ZONES
  }

  getZoneTimers() {
    return { ...this.zoneTimers }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeartRateMonitor
}
