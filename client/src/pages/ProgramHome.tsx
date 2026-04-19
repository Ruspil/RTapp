import { useEffect, useMemo, useState, useCallback } from "react"
import {
  ChevronRight,
  ChevronLeft,
  Play,
  Zap,
  Target,
  Clock,
  CircleCheck as CheckCircle2,
  Sparkles,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getWeekProgram,
  TOTAL_WEEKS,
  type Session,
  type CompletedSession,
  type Program,
} from "@/lib/workoutData"
import {
  getProgramWeekFromStart,
  PROGRAM_START_ISO,
} from "@/lib/cardioPlan"
import {
  getActiveProgram,
  getAIPlan,
  type ActiveProgram,
} from "@/lib/aiPlan/storage"
import { aiPlanToProgram } from "@/lib/aiPlan/adapter"
import type { AIPlan } from "@/lib/aiPlan/schema"
import { BrandLogo } from "@/components/app/BrandLogo"

interface ProgramHomeProps {
  userName: string
  currentWeek: number
  completedSessions: CompletedSession[]
  activeDay: number
  onActiveDayChange: (day: number) => void
  onSelectSession: (session: Session, day: number) => void
  onWeekChange: (delta: -1 | 1) => void
  /** Kept for API compatibility with App.tsx; unused in this layout. */
  onNavigateToTraining?: (type: "solo" | "duo" | "club") => void
  onNavigateToHeartRate?: () => void
  onSetWeek?: (week: number) => void
  onFullReset?: () => void
  onResetProgress?: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

export function ProgramHome({
  userName,
  currentWeek,
  completedSessions,
  activeDay,
  onActiveDayChange,
  onSelectSession,
  onWeekChange,
  onNavigateToHeartRate,
  onSetWeek,
}: ProgramHomeProps) {
  const [activeProgram, setActiveProgramState] = useState<ActiveProgram>(() =>
    getActiveProgram(),
  )
  const [aiPlan, setAIPlanState] = useState<AIPlan | null>(() => getAIPlan())

  // The AI plan can be updated from anywhere (the AI builder lives in Profile,
  // not here anymore). Re-read storage on mount, on tab/window focus, and when
  // localStorage changes from another component in the same tab.
  const refreshAIState = useCallback(() => {
    setActiveProgramState(getActiveProgram())
    setAIPlanState(getAIPlan())
  }, [])
  useEffect(() => {
    refreshAIState()
    const onFocus = () => refreshAIState()
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshAIState()
    }
    const onStorage = (e: StorageEvent) => {
      // Only react to keys we care about to avoid wasted re-reads.
      if (
        !e.key ||
        e.key.includes("ai-plan") ||
        e.key.includes("active-program")
      ) {
        refreshAIState()
      }
    }
    // Custom event fired by the AI builder (in Profile) after a plan changes,
    // so this component picks up the new plan even when the swipe-tab pane
    // didn't unmount/remount.
    const onAIPlanChanged = () => refreshAIState()
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("storage", onStorage)
    window.addEventListener("trainhard:ai-plan-changed", onAIPlanChanged)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("trainhard:ai-plan-changed", onAIPlanChanged)
    }
  }, [refreshAIState])

  const calendarWeek = getProgramWeekFromStart()
  const isAIMode = activeProgram === "ai" && aiPlan != null
  const program: Program = isAIMode
    ? aiPlanToProgram(aiPlan, currentWeek)
    : getWeekProgram(currentWeek)
  const currentDay =
    program.days.find((d) => d.day === activeDay) ?? program.days[0]
  const programTotalWeeks = isAIMode ? aiPlan.totalWeeks : TOTAL_WEEKS

  const isDayComplete = (day: number) => {
    const d = program.days.find((dd) => dd.day === day)
    if (!d) return false
    return d.sessions.every((s) =>
      completedSessions.some((cs) => cs.sessionId === s.id && cs.day === day),
    )
  }

  const getCompletedSession = (sessionId: string, day: number) =>
    completedSessions.find(
      (cs) => cs.sessionId === sessionId && cs.day === day,
    )

  const completedCountWeek = useMemo(
    () => program.days.filter((d) => isDayComplete(d.day)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [program, completedSessions],
  )
  const totalDays = program.days.length

  // Pick the "primary" session of the active day = the first one not completed,
  // otherwise the last completed (so we can show its summary).
  const heroSession =
    currentDay.sessions.find(
      (s) => !getCompletedSession(s.id, activeDay),
    ) ?? currentDay.sessions[currentDay.sessions.length - 1]
  const heroCompleted = heroSession
    ? getCompletedSession(heroSession.id, activeDay)
    : undefined
  const heroIsCompleted = !!heroCompleted

  return (
    <div className="nk-page">
      {/* Top bar */}
      <header className="nk-topbar">
        <BrandLogo />
        <button
          type="button"
          className="nk-icon-btn"
          aria-label="Heart rate monitor"
          onClick={() => onNavigateToHeartRate?.()}
        >
          <Heart className="size-4" />
        </button>
      </header>

      {/* HERO — Today's session */}
      <section className="px-6 pt-4">
        <div className="nk-hero p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <span className="nk-eyebrow">Today's Session</span>
            {heroIsCompleted && (
              <span className="nk-chip nk-chip-solid">
                <CheckCircle2 className="size-3" /> Done
              </span>
            )}
          </div>

          {heroSession ? (
            <>
              <h1 className="nk-h-display mb-3 line-clamp-3">
                {heroSession.name}
              </h1>

              <div className="flex flex-wrap gap-2 mb-7">
                <span className="nk-chip">
                  {heroSession.type === "workout" ? (
                    <Zap className="size-3" />
                  ) : (
                    <Target className="size-3" />
                  )}
                  {heroSession.type}
                </span>
                <span className="nk-chip">
                  <Clock className="size-3" />
                  <span className="nk-num">{heroSession.duration} min</span>
                </span>
                <span className="nk-chip">
                  Day {activeDay} · Week {currentWeek}
                </span>
              </div>

              {heroIsCompleted ? (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="nk-stat">
                    <span className="nk-stat-label">Duration</span>
                    <span className="nk-stat-value">
                      {formatDuration(heroCompleted!.durationSeconds)}
                    </span>
                  </div>
                  <div className="nk-stat">
                    <span className="nk-stat-label">Completion</span>
                    <span className="nk-stat-value">
                      {heroCompleted!.percentComplete}%
                    </span>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onSelectSession(heroSession, activeDay)}
                className="nk-cta"
              >
                <Play className="size-4 fill-current" />
                {heroIsCompleted ? "View Summary" : "Start Session"}
              </button>
            </>
          ) : (
            <>
              <h1 className="nk-h-display mb-3">Rest Day</h1>
              <p className="text-sm text-white/60 mb-6">
                No session scheduled. Recover and come back stronger.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Week progress */}
      <section className="nk-stack-lg pt-32">
        <div className="flex items-end justify-between">
          <div>
            <span className="nk-eyebrow text-white/40">This Week</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black tracking-tight nk-num">
                {completedCountWeek}
              </span>
              <span className="text-lg font-extrabold text-white/40 nk-num">
                / {totalDays}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">
                Days
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onWeekChange(-1)}
              disabled={currentWeek <= 1}
              className="nk-icon-btn disabled:opacity-30"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-extrabold uppercase tracking-widest text-white/60 nk-num min-w-[3rem] text-center">
              W{currentWeek}/{programTotalWeeks}
            </span>
            <button
              type="button"
              onClick={() => onWeekChange(1)}
              disabled={currentWeek >= programTotalWeeks}
              className="nk-icon-btn disabled:opacity-30"
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Day strip */}
        <div
          className={cn(
            "grid gap-1.5",
            totalDays === 5
              ? "grid-cols-5"
              : totalDays === 6
                ? "grid-cols-6"
                : totalDays === 7
                  ? "grid-cols-7"
                  : "grid-cols-5",
          )}
        >
          {program.days.map((d) => {
            const complete = isDayComplete(d.day)
            const isActive = activeDay === d.day
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => onActiveDayChange(d.day)}
                data-active={isActive}
                data-complete={complete}
                className="nk-day-pill"
                aria-current={isActive ? "true" : undefined}
              >
                <span className="text-[10px] font-extrabold tracking-widest opacity-70">
                  {DAY_LABELS[(d.day - 1) % 7]}
                </span>
                <span className="text-lg font-black nk-num">{d.day}</span>
                {complete ? (
                  <CheckCircle2 className="size-3.5" strokeWidth={3} />
                ) : (
                  <span className="size-1.5 rounded-full bg-current opacity-30" />
                )}
              </button>
            )
          })}
        </div>

        {!isAIMode && onSetWeek && calendarWeek !== currentWeek && (
          <button
            type="button"
            onClick={() => onSetWeek(calendarWeek)}
            className="text-[10px] font-extrabold uppercase tracking-widest text-white/45 hover:text-white/80 transition-colors text-left"
          >
            → Jump to current week ({calendarWeek}) · Plan started{" "}
            {PROGRAM_START_ISO}
          </button>
        )}
      </section>

      {/* Today's other sessions list */}
      {currentDay.sessions.length > 1 && (
        <section className="nk-stack-lg pt-32">
          <div className="flex items-center justify-between">
            <h2 className="nk-h-section">Day {activeDay} — All Sessions</h2>
          </div>
          <div className="flex flex-col gap-3">
            {currentDay.sessions.map((session) => {
              const completed = getCompletedSession(session.id, activeDay)
              const isCompleted = !!completed
              const isHero = heroSession && session.id === heroSession.id
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session, activeDay)}
                  className="nk-tile gap-4"
                >
                  <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {session.type === "workout" ? (
                      <Zap className="size-5" />
                    ) : (
                      <Target className="size-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="nk-eyebrow text-white/45">
                        {session.type}
                      </span>
                      {isHero && (
                        <span className="nk-eyebrow text-white">· Next</span>
                      )}
                      {isCompleted && (
                        <span className="nk-eyebrow text-emerald-400">
                          · Done
                        </span>
                      )}
                    </div>
                    <p className="font-extrabold text-base leading-tight truncate">
                      {session.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-bold text-white/50">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span className="nk-num">{session.duration} min</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-white/30 shrink-0" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* AI plan accent (only if a plan exists) */}
      {aiPlan && (
        <section className="nk-stack-lg pt-32">
          <h2 className="nk-h-section">AI Coach</h2>
          <div className="nk-card p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="size-3.5" />
              <span className="nk-eyebrow">Week {currentWeek}</span>
            </div>
            <p className="font-extrabold text-base leading-snug mb-1">
              {aiPlan.weeks.find((w) => w.week === currentWeek)?.theme ??
                "Custom plan active"}
            </p>
            <p className="text-xs text-white/55 line-clamp-3">
              {aiPlan.coachingSummary}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
