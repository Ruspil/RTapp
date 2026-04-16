/**
 * Short beeps using Web Audio (no asset files). Requires a user gesture first on some browsers.
 */

let audioCtx: AudioContext | null = null

function ctx(): AudioContext {
  if (typeof window === "undefined") throw new Error("no window")
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

export async function unlockWorkoutAudio(): Promise<void> {
  await ensureRunning()
}

async function ensureRunning(): Promise<void> {
  try {
    const c = ctx()
    if (c.state === "suspended") await c.resume()
  } catch {
    /* ignore — autoplay blocked */
  }
}

function beep(
  frequency: number,
  durationMs: number,
  volume = 0.12,
  type: OscillatorType = "sine",
): void {
  try {
    const ac = ctx()
    const t0 = ac.currentTime
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, t0)
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(volume, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + durationMs / 1000 + 0.05)
  } catch {
    /* ignore */
  }
}

/** Soft tick during prep countdown */
export async function playPrepTick(): Promise<void> {
  await ensureRunning()
  beep(620, 70, 0.1)
}

/** “Go” — work interval begins */
export async function playWorkStartChime(): Promise<void> {
  await ensureRunning()
  beep(784, 120, 0.14)
  setTimeout(() => beep(1040, 180, 0.13), 100)
}

/** Rest period finished */
export async function playRestComplete(): Promise<void> {
  await ensureRunning()
  beep(523, 140, 0.12)
  setTimeout(() => beep(659, 160, 0.12), 130)
  setTimeout(() => beep(784, 220, 0.11), 280)
}

/** Work interval (plank, etc.) finished */
export async function playWorkIntervalComplete(): Promise<void> {
  await ensureRunning()
  beep(880, 100, 0.1)
  setTimeout(() => beep(660, 120, 0.11), 90)
  setTimeout(() => beep(990, 200, 0.12), 200)
}
