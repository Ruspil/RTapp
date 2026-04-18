import { useState, useCallback, useMemo, lazy, Suspense, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Welcome } from "@/pages/Welcome"
import { ProgramHome } from "@/pages/ProgramHome"
import { TOTAL_WEEKS, type Session, type CompletedSession } from "@/lib/workoutData"
import { getActiveProgram, getAIPlan } from "@/lib/aiPlan/storage"

// Heavy/secondary screens are split off so the initial bundle stays small.
const WorkoutDetails = lazy(() =>
  import("@/pages/WorkoutDetails").then((m) => ({ default: m.WorkoutDetails })),
)
const ActiveWorkout = lazy(() =>
  import("@/pages/ActiveWorkout").then((m) => ({ default: m.ActiveWorkout })),
)
const SoloFootTraining = lazy(() => import("@/pages/SoloFootTraining"))
const DuoFootTraining = lazy(() => import("@/pages/DuoFootTraining"))
const ClubTraining = lazy(() => import("@/pages/ClubTraining"))
const HeartRateMonitor = lazy(() =>
  import("@/pages/HeartRateMonitor").then((m) => ({ default: m.HeartRateMonitor })),
)

type Screen = "welcome" | "program" | "details" | "active" | "solo" | "duo" | "club" | "heartrate"

/** Clé stable par vue pour déclencher l’animation d’entrée (fade + léger slide). */
function getPageTransitionKey(
  userName: string | null,
  screen: Screen,
  selectedSession: Session | null,
  selectedDay: number,
): string {
  if (!userName) return "welcome"
  if (screen === "heartrate") return "heartrate"
  if (screen === "solo") return "solo"
  if (screen === "duo") return "duo"
  if (screen === "club") return "club"
  if (screen === "details" && selectedSession) return `details-${selectedSession.id}-d${selectedDay}`
  if (screen === "active" && selectedSession) return `active-${selectedSession.id}-d${selectedDay}`
  return "program"
}

const USER_KEY = "trainhard-user"
const COMPLETED_KEY = "trainhard-completed"
const WEEK_KEY = "trainhard-current-week"

function getSavedUser(): string | null {
  try {
    return localStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

function saveUser(name: string) {
  try {
    localStorage.setItem(USER_KEY, name)
  } catch {
    // ignore
  }
}

function getSavedCompleted(): CompletedSession[] {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCompleted(sessions: CompletedSession[]) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(sessions))
  } catch {
    // ignore
  }
}

/**
 * Returns the upper bound for the week selector. Defaults to the static
 * program length but follows the active AI plan length when one is in use.
 */
function getProgramMaxWeeks(): number {
  if (getActiveProgram() === "ai") {
    const plan = getAIPlan()
    if (plan) return plan.totalWeeks
  }
  return TOTAL_WEEKS
}

function getSavedWeek(): number {
  try {
    const raw = localStorage.getItem(WEEK_KEY)
    const n = raw ? parseInt(raw, 10) : 1
    if (isNaN(n)) return 1
    return Math.min(Math.max(n, 1), getProgramMaxWeeks())
  } catch {
    return 1
  }
}

function saveWeek(week: number) {
  try {
    localStorage.setItem(WEEK_KEY, String(week))
  } catch {
    // ignore
  }
}

/** Lightweight fallback while a lazy chunk loads (matches the dark theme). */
function ScreenFallback() {
  return <div className="min-h-svh w-full bg-zinc-950" aria-busy="true" />
}

export function App() {
  const [userName, setUserName] = useState<string | null>(() => getSavedUser())
  const [screen, setScreen] = useState<Screen>("program")
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>(() => getSavedCompleted())
  const [currentWeek, setCurrentWeek] = useState<number>(() => getSavedWeek())

  const handleStart = useCallback((name: string) => {
    saveUser(name)
    setUserName(name)
    setScreen("program")
  }, [])

  const handleSelectSession = useCallback((session: Session, day: number) => {
    setSelectedSession(session)
    setSelectedDay(day)
    setScreen("details")
  }, [])

  const handleStartWorkout = useCallback(() => {
    setScreen("active")
  }, [])

  const handleFinishWorkout = useCallback(
    (durationSeconds: number, percentComplete: number) => {
      if (!selectedSession) return
      const completed: CompletedSession = {
        sessionId: selectedSession.id,
        day: selectedDay,
        completedAt: new Date().toISOString(),
        durationSeconds,
        percentComplete,
      }
      setCompletedSessions((prev) => {
        const updated = [
          ...prev.filter((cs) => !(cs.sessionId === selectedSession.id && cs.day === selectedDay)),
          completed,
        ]
        saveCompleted(updated)
        return updated
      })
      setScreen("program")
      setSelectedSession(null)
    },
    [selectedSession, selectedDay],
  )

  const handleWeekChange = useCallback((delta: -1 | 1) => {
    setCurrentWeek((prev) => {
      const next = Math.min(Math.max(prev + delta, 1), getProgramMaxWeeks())
      saveWeek(next)
      return next
    })
  }, [])

  const handleFullReset = useCallback(() => {
    // localStorage already wiped by the builder sheet — reset in-memory state
    // and route back to the Welcome screen.
    setCompletedSessions([])
    setSelectedSession(null)
    setSelectedDay(1)
    setCurrentWeek(1)
    setUserName(null)
    setScreen("program")
  }, [])

  const handleActiveDayChange = useCallback((day: number) => {
    setSelectedDay(day)
  }, [])

  const handleBack = useCallback(() => {
    setScreen((prev) => {
      if (prev === "details") return "program"
      if (prev === "active") return "details"
      if (prev === "solo" || prev === "duo" || prev === "club" || prev === "heartrate") return "program"
      return prev
    })
  }, [])

  const handleNavigateToTraining = useCallback((type: "solo" | "duo" | "club") => {
    setScreen(type)
  }, [])

  const handleNavigateToHeartRate = useCallback(() => setScreen("heartrate"), [])

  const handleSetWeek = useCallback((w: number) => {
    setCurrentWeek(() => {
      const next = Math.min(Math.max(w, 1), getProgramMaxWeeks())
      saveWeek(next)
      return next
    })
  }, [])

  const pageKey = useMemo(
    () => getPageTransitionKey(userName, screen, selectedSession, selectedDay),
    [userName, screen, selectedSession, selectedDay],
  )

  let body: ReactNode = null

  if (!userName) {
    body = <Welcome onStart={handleStart} />
  } else if (screen === "heartrate") {
    body = <HeartRateMonitor onBack={handleBack} />
  } else if (screen === "solo") {
    body = <SoloFootTraining onBack={handleBack} />
  } else if (screen === "duo") {
    body = <DuoFootTraining onBack={handleBack} />
  } else if (screen === "club") {
    body = <ClubTraining onBack={handleBack} />
  } else if (screen === "program" || !selectedSession) {
    body = (
      <ProgramHome
        userName={userName}
        currentWeek={currentWeek}
        completedSessions={completedSessions}
        activeDay={selectedDay}
        onActiveDayChange={handleActiveDayChange}
        onSelectSession={handleSelectSession}
        onWeekChange={handleWeekChange}
        onNavigateToTraining={handleNavigateToTraining}
        onNavigateToHeartRate={handleNavigateToHeartRate}
        onSetWeek={handleSetWeek}
        onFullReset={handleFullReset}
      />
    )
  } else if (screen === "details" && selectedSession) {
    body = (
      <WorkoutDetails
        session={selectedSession}
        day={selectedDay}
        onBack={handleBack}
        onStart={handleStartWorkout}
      />
    )
  } else if (screen === "active" && selectedSession) {
    body = (
      <ActiveWorkout
        session={selectedSession}
        day={selectedDay}
        onFinish={handleFinishWorkout}
      />
    )
  }

  return (
    <div key={pageKey} className={cn("ui-page-enter-shell min-h-svh w-full")}>
      <Suspense fallback={<ScreenFallback />}>{body}</Suspense>
    </div>
  )
}

export default App
