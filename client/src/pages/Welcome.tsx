import { useState, useEffect } from "react"

interface WelcomeProps {
  onStart: (name: string) => void
}

export function Welcome({ onStart }: WelcomeProps) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [logoScale, setLogoScale] = useState(0)
  const [logoBreathing, setLogoBreathing] = useState(false)

  useEffect(() => {
    setTimeout(() => setLogoScale(1), 100)

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setFadeOut(true)
          setTimeout(() => onStart("Ruspil"), 600)
          return 100
        }
        return prev + Math.random() * 3 + 0.5
      })
    }, 30)

    return () => clearInterval(timer)
  }, [onStart])

  useEffect(() => {
    if (logoScale !== 1) return
    const t = window.setTimeout(() => setLogoBreathing(true), 720)
    return () => window.clearTimeout(t)
  }, [logoScale])

  return (
    <div
      className={`min-h-svh bg-[var(--nike-bg)] flex flex-col items-center justify-between transition-[opacity,transform] duration-700 ease-out will-change-transform pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)] px-6 ${
        fadeOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      {/* Top brand */}
      <div className="text-center w-full">
        <span className="nk-eyebrow text-white/40">Ruspil Training</span>
      </div>

      {/* Center logo */}
      <div className="flex flex-col items-center">
        <div
          className={`flex items-center justify-center w-32 h-32 rounded-2xl bg-white shadow-[0_30px_80px_rgba(255,255,255,0.08)] transition-transform duration-700 ease-out ${
            logoBreathing ? "ui-logo-breathe" : ""
          }`}
          style={
            logoBreathing
              ? undefined
              : {
                  transform: `scale(${logoScale})`,
                  opacity: logoScale,
                }
          }
        >
          <span className="text-black font-black text-5xl tracking-[-0.08em] leading-none">
            RT
          </span>
        </div>

        <h1 className="nk-h-display mt-10 text-center">
          Train.
          <br />
          Recover.
          <br />
          Repeat.
        </h1>
      </div>

      {/* Bottom: progress + label */}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="w-full max-w-[18rem] h-[3px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-[width] duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="nk-eyebrow text-white/40 nk-num">
          Loading {Math.floor(progress)}%
        </span>
      </div>
    </div>
  )
}
