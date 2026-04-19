import { useState, useCallback, useMemo, useEffect, lazy, Suspense, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Welcome } from "@/pages/Welcome"
import { ProgramHome } from "@/pages/ProgramHome"
import { BottomTabBar, type TabId } from "@/components/app/BottomTabBar"
import { SwipeTabs } from "@/components/app/SwipeTabs"
import { TOTAL_WEEKS, type Session, type CompletedSession } from "@/lib/workoutData"
import { getActiveProgram, getAIPlan } from "@/lib/aiPlan/storage"
import { wipeAllTrainhardKeys } from "@/lib/storageKeys"

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
const Library = lazy(() => import("@/pages/Library"))
const Profile = lazy(() => import("@/pages/Profile"))
const HeartRateMonitor = lazy(() =>
  import("@/pages/HeartRateMonitor").then((m) => ({ default: m.HeartRateMonitor })),
)

type Screen =
  | "welcome"
  | "program"
  | "details"
  | "active"
  | "solo"
  | "duo"
  | "club"
  | "heartrate"
  | "library"
  | "profile"

/** Screens that show the bottom tab bar (= main hub views). */
const TAB_SCREENS: Record<Screen, TabId | null> = {
  welcome: null,
  program: "today",
  details: null,
  active: null,
  solo: "library",
  duo: "library",
  club: "library",
  heartrate: null,
  library: "library",
  profile: "profile",
}

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
  if (screen === "library") return "library"
  if (screen === "profile") return "profile"
  if (screen === "details" && selectedSession) return `details-${selectedSession.id}-d${selectedDay}`
  if (screen === "active" && selectedSession) return `active-${selectedSession.id}-d${selectedDay}`
  return "program"
}

const USER_KEY = "trainhard-user"
const COMPLETED_KEY = "trainhard-completed"
const WEEK_KEY = "trainhard-current-week"

function getSavedUser(): string | null {
  try { return localStorage.getItem(USER_KEY) } catch { return null }
}
function saveUser(name: string) {
  try { localStorage.setItem(USER_KEY, name) } catch { /* ignore */ }
}
function getSavedCompleted(): CompletedSession[] {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveCompleted(sessions: CompletedSession[]) {
  try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(sessions)) } catch { /* ignore */ }
}

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
  } catch { return 1 }
}
function saveWeek(week: number) {
  try { localStorage.setItem(WEEK_KEY, String(week)) } catch { /* ignore */ }
}

function ScreenFallback() {
  return <div className="min-h-svh w-full bg-[var(--nike-bg)]" aria-busy="true" />
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

  const [toast, setToast] = useState<string | null>(null)
  // Confirm dialog for destructive resets — lives at the App level so it
  // renders OUTSIDE the SwipeTabs CSS transform (otherwise `position: fixed`
  // becomes relative to the transformed parent and the modal slides with the
  // pane while we navigate away).
  const [confirmReset, setConfirmReset] = useState<"progress" | "full" | null>(
    null,
  )

  // Auto-dismiss toast after 2.4s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const handleFullReset = useCallback(() => {
    // Wipe ALL local data (account, plan, sessions, baselines, sounds, etc.)
    wipeAllTrainhardKeys()
    setCompletedSessions([])
    setSelectedSession(null)
    setSelectedDay(1)
    setCurrentWeek(1)
    setUserName(null)
    setScreen("program")
    setToast("App reset — starting fresh")
    // Notify ProgramHome (which lives in another swipe-tab pane and stays
    // mounted) so it drops the cached AI plan immediately.
    try { window.dispatchEvent(new Event("trainhard:ai-plan-changed")) } catch {}
  }, [])

  const handleResetProgress = useCallback(() => {
    try {
      localStorage.removeItem(COMPLETED_KEY)
      localStorage.removeItem(WEEK_KEY)
      localStorage.removeItem("trainhard-program-start-iso")
      localStorage.removeItem("completedExercises")
    } catch { /* ignore */ }
    setCompletedSessions([])
    setCurrentWeek(1)
    setSelectedDay(1)
    setSelectedSession(null)
    setScreen("program")
    setToast("Progress reset · back to week 1")
  }, [])

  const handleConfirmReset = useCallback(() => {
    const action = confirmReset
    setConfirmReset(null)
    if (action === "full") handleFullReset()
    else if (action === "progress") handleResetProgress()
  }, [confirmReset, handleFullReset, handleResetProgress])

  const handleUserNameUpdate = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    saveUser(trimmed)
    setUserName(trimmed)
    setToast(`Welcome, ${trimmed}`)
  }, [])

  const handleActiveDayChange = useCallback((day: number) => {
    setSelectedDay(day)
  }, [])

  const handleBack = useCallback(() => {
    setScreen((prev) => {
      if (prev === "details") return "program"
      if (prev === "active") return "details"
      if (prev === "solo" || prev === "duo" || prev === "club") return "library"
      if (prev === "heartrate") return "profile"
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

  const handleTabChange = useCallback((tab: TabId) => {
    setSelectedSession(null)
    if (tab === "today") setScreen("program")
    else if (tab === "library") setScreen("library")
    else if (tab === "profile") setScreen("profile")
  }, [])

  const pageKey = useMemo(
    () => getPageTransitionKey(userName, screen, selectedSession, selectedDay),
    [userName, screen, selectedSession, selectedDay],
  )

  // Whether the current screen is one of the 3 main hubs that swipes between
  // each other (Today/Library/Profile). Sub-screens (solo, club, details, etc.)
  // disable horizontal swipe so they don't conflict with their own gestures.
  const isHubScreen =
    screen === "program" || screen === "library" || screen === "profile"

  let body: ReactNode = null

  if (!userName) {
    body = <Welcome onStart={handleStart} />
  } else if (isHubScreen) {
    // Render all 3 hub pages side-by-side and let the user swipe between them.
    const hubTabs: TabId[] = ["today", "library", "profile"]
    const tabToScreen: Record<TabId, "program" | "library" | "profile"> = {
      today: "program",
      library: "library",
      profile: "profile",
    }
    const currentTab: TabId =
      screen === "program" ? "today" : (screen as "library" | "profile")
    body = (
      <SwipeTabs<TabId>
        tabs={hubTabs}
        activeTab={currentTab}
        onChangeTab={(t) => setScreen(tabToScreen[t])}
        renderTab={(t) => {
          if (t === "today") {
            return (
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
                onResetProgress={handleResetProgress}
              />
            )
          }
          if (t === "library") {
            return <Library onNavigateToTraining={handleNavigateToTraining} />
          }
          return (
            <Profile
              userName={userName}
              completedSessions={completedSessions}
              onNavigateToHeartRate={handleNavigateToHeartRate}
              onRequestReset={(kind) => setConfirmReset(kind)}
              onUserNameUpdate={handleUserNameUpdate}
            />
          )
        }}
      />
    )
  } else if (screen === "heartrate") {
    body = <HeartRateMonitor onBack={handleBack} />
  } else if (screen === "solo") {
    body = <SoloFootTraining onBack={handleBack} />
  } else if (screen === "duo") {
    body = <DuoFootTraining onBack={handleBack} />
  } else if (screen === "club") {
    body = <ClubTraining onBack={handleBack} />
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

  const activeTab = TAB_SCREENS[screen]
  const showTabs = !!userName && activeTab !== null

  return (
    <div className={cn("min-h-svh w-full bg-[var(--nike-bg)] text-white")}>
      <div key={isHubScreen ? "hub" : pageKey} className={cn("ui-page-enter-shell")}>
        <Suspense fallback={<ScreenFallback />}>{body}</Suspense>
      </div>
      {showTabs && activeTab && (
        <BottomTabBar active={activeTab} onChange={handleTabChange} />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      {confirmReset && (
        <ConfirmResetDialog
          kind={confirmReset}
          onConfirm={handleConfirmReset}
          onCancel={() => setConfirmReset(null)}
        />
      )}
    </div>
  )
}

function ConfirmResetDialog({
  kind,
  onConfirm,
  onCancel,
}: {
  kind: "progress" | "full"
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-5"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#141414] border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-black tracking-tight uppercase text-white">
          {kind === "full" ? "Full Reset?" : "Reset Progress?"}
        </h3>
        <p className="text-sm text-white/60 mt-2 mb-6">
          {kind === "full"
            ? "This deletes your account, completed sessions, AI plan, sounds — everything. You'll start over from the welcome screen."
            : "This wipes your completed sessions and current week. Your AI plan, baselines and account stay intact."}
        </p>
        <div className="flex flex-col gap-2">
          <button type="button" className="nk-cta" onClick={onConfirm}>
            Confirm
          </button>
          <button type="button" className="nk-cta-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0) + 6.5rem)",
        animation: "ui-toast-in 280ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black font-extrabold text-sm tracking-tight uppercase shadow-[0_12px_32px_rgba(255,255,255,0.18)] hover:bg-white/90 transition-colors"
      >
        <span className="size-1.5 rounded-full bg-black" />
        {message}
      </button>
    </div>
  )
}

export default App
