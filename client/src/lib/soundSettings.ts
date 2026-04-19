const SFX_ENABLED_KEY = "trainhard-sfx-enabled"
const SFX_VOLUME_KEY = "trainhard-sfx-volume" // 0..100

export function getSfxEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SFX_ENABLED_KEY)
    return raw == null ? true : raw !== "0"
  } catch {
    return true
  }
}

export function setSfxEnabled(v: boolean) {
  try {
    localStorage.setItem(SFX_ENABLED_KEY, v ? "1" : "0")
  } catch {
    /* ignore */
  }
}

export function getSfxVolume(): number {
  try {
    const raw = localStorage.getItem(SFX_VOLUME_KEY)
    const n = raw == null ? 60 : parseInt(raw, 10)
    if (Number.isNaN(n)) return 60
    return Math.min(Math.max(n, 0), 100)
  } catch {
    return 60
  }
}

export function setSfxVolume(v: number) {
  try {
    const n = Math.min(Math.max(Math.round(v), 0), 100)
    localStorage.setItem(SFX_VOLUME_KEY, String(n))
  } catch {
    /* ignore */
  }
}

