import { useState } from "react"
import { Welcome } from "@/pages/Welcome"
import { ProgramHome } from "@/pages/ProgramHome"
import { WorkoutDetails } from "@/pages/WorkoutDetails"
import { ActiveWorkout } from "@/pages/ActiveWorkout"
import SoloFootTraining from "@/pages/SoloFootTraining"
import DuoFootTraining from "@/pages/DuoFootTraining"
import ClubTraining from "@/pages/ClubTraining"
import { HeartRateMonitor } from "@/pages/HeartRateMonitor"
import { type Session, type CompletedSession } from "@/lib/workoutData"

type Screen = "welcome" | "program" | "details" | "active" | "solo" | "duo" | "club" | "heartrate"

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

function getSavedWeek(): number {
  try {
    const raw = localStorage.getItem(WEEK_KEY)
    const n = raw ? parseInt(raw, 10) : 1
    return isNaN(n) ? 1 : Math.min(Math.max(n, 1), 12)
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

export function App() {
  const [userName, setUserName] = useState<string | null>(() => getSavedUser())
  const [screen, setScreen] = useState<Screen>("program")
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>(() => getSavedCompleted())
  const [currentWeek, setCurrentWeek] = useState<number>(() => getSavedWeek())

  const handleStart = (name: string) => {
    saveUser(name)
    setUserName(name)
    setScreen("program")
  }

  const handleSelectSession = (session: Session, day: number) => {
    setSelectedSession(session)
    setSelectedDay(day)
    setScreen("details")
  }

  const handleStartWorkout = () => {
    setScreen("active")
  }

  const handleFinishWorkout = (durationSeconds: number, percentComplete: number) => {
    if (!selectedSession) return
    const completed: CompletedSession = {
      sessionId: selectedSession.id,
      day: selectedDay,
      completedAt: new Date().toISOString(),
      durationSeconds,
      percentComplete,
    }
    const updated = [...completedSessions.filter(
      (cs) => !(cs.sessionId === selectedSession.id && cs.day === selectedDay)
    ), completed]
    setCompletedSessions(updated)
    saveCompleted(updated)
    setScreen("program")
    setSelectedSession(null)
  }

  const handleWeekChange = (delta: -1 | 1) => {
    const next = Math.min(Math.max(currentWeek + delta, 1), 12)
    setCurrentWeek(next)
    saveWeek(next)
  }

  const handleBack = () => {
    if (screen === "details") setScreen("program")
    else if (screen === "active") setScreen("details")
    else if (screen === "solo" || screen === "duo" || screen === "club" || screen === "heartrate") setScreen("program")
  }

  const handleNavigateToTraining = (type: "solo" | "duo" | "club") => {
    setScreen(type)
  }

  if (!userName) {
    return <Welcome onStart={handleStart} />
  }

  if (screen === "heartrate") {
    return <HeartRateMonitor onBack={handleBack} />
  }

  if (screen === "solo") {
    return <SoloFootTraining onBack={handleBack} />
  }

  if (screen === "duo") {
    return <DuoFootTraining onBack={handleBack} />
  }

  if (screen === "club") {
    return <ClubTraining onBack={handleBack} />
  }

  if (screen === "program" || !selectedSession) {
    return (
      <ProgramHome
        userName={userName}
        currentWeek={currentWeek}
        completedSessions={completedSessions}
        onSelectSession={handleSelectSession}
        onWeekChange={handleWeekChange}
        onNavigateToTraining={handleNavigateToTraining}
        onNavigateToHeartRate={() => setScreen("heartrate")}
      />
    )
  }

  if (screen === "details") {
    return (
      <WorkoutDetails
        session={selectedSession}
        day={selectedDay}
        onBack={handleBack}
        onStart={handleStartWorkout}
      />
    )
  }

  if (screen === "active") {
    return (
      <ActiveWorkout
        session={selectedSession}
        day={selectedDay}
        onFinish={handleFinishWorkout}
      />
    )
  }

  return null
}

export default App
