import { useState } from "react"
import { ChevronLeft, ChevronRight, MessageCircle, Menu, Zap, Target, Clock, ChevronRight as ChevronRightIcon, CircleCheck as CheckCircle2, Activity, X, Watch, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { getWeekProgram, TOTAL_WEEKS, type Session, type CompletedSession } from "@/lib/workoutData"
import { AIChatPanel } from "@/components/AIChatPanel"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/app/Screen"
import { Section } from "@/components/app/Section"
import { StatTile } from "@/components/app/StatTile"
import { IconButton } from "@/components/app/IconButton"

interface ProgramHomeProps {
  userName: string
  currentWeek: number
  completedSessions: CompletedSession[]
  onSelectSession: (session: Session, day: number) => void
  onWeekChange: (delta: -1 | 1) => void
  onNavigateToTraining?: (type: 'solo' | 'duo' | 'club') => void
  onNavigateToHeartRate?: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function ProgramHome({ userName, currentWeek, completedSessions, onSelectSession, onWeekChange, onNavigateToTraining, onNavigateToHeartRate }: ProgramHomeProps) {
  const [activeDay, setActiveDay] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const [helioConnected, setHelioConnected] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const program = getWeekProgram(currentWeek)
  const currentDay = program.days.find((d) => d.day === activeDay)!

  const isDayComplete = (day: number) => {
    const d = program.days.find((dd) => dd.day === day)
    if (!d) return false
    return d.sessions.every((s) => completedSessions.some((cs) => cs.sessionId === s.id && cs.day === day))
  }

  const getCompletedSession = (sessionId: string, day: number) =>
    completedSessions.find((cs) => cs.sessionId === sessionId && cs.day === day)

  const completedCount = completedSessions.length
  const totalSessions = program.days.reduce((acc, d) => acc + d.sessions.length, 0)

  return (
    <Screen className="bg-muted/30 flex flex-col">
      <div className="bg-zinc-900 text-white">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 relative">
          <IconButton className="p-1 text-white/80 hover:bg-white/10" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu className="size-5 text-white/80" />
          </IconButton>
          {menuOpen && (
            <div className="absolute top-12 left-4 bg-zinc-800 rounded-lg shadow-lg z-50 min-w-48">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setHelioConnected(!helioConnected)
                  setMenuOpen(false)
                }}
                className="w-full px-4 py-3 flex items-center gap-2 hover:bg-zinc-700 transition-colors text-white text-sm"
              >
                <Watch className="size-4" />
                <span>Helio Strap {helioConnected ? '✓' : ''}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMenuOpen(false)}
                className="w-full px-4 py-3 flex items-center gap-2 hover:bg-zinc-700 transition-colors text-white text-sm border-t border-zinc-700"
              >
                <X className="size-4" />
                <span>Close</span>
              </Button>
            </div>
          )}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center size-8 rounded bg-white">
              <span className="text-zinc-900 font-black text-sm tracking-tighter">RT</span>
            </div>
          </div>
          <IconButton className="p-1 relative hover:bg-white/10" onClick={() => setChatOpen(true)}>
            <MessageCircle className="size-5 text-white/80" />
            <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gradient-to-br from-red-500 to-orange-500" />
          </IconButton>
        </div>

        <div className="flex gap-0.5 px-4 pb-3">
          {Array.from({ length: totalSessions }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                i < completedCount ? "bg-white/90" : "bg-white/20"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between px-5 pb-5">
          <IconButton
            className={cn("p-1", currentWeek <= 1 ? "text-white/20" : "text-white/50")}
            onClick={() => onWeekChange(-1)}
            disabled={currentWeek <= 1}
          >
            <ChevronLeft className="size-5" />
          </IconButton>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-white/50 uppercase">
              {userName}&apos;s Program
            </p>
            <p className="text-base font-bold text-white">{program.week}</p>
          </div>
          <IconButton
            className={cn("p-1", currentWeek >= TOTAL_WEEKS ? "text-white/20" : "text-white/50")}
            onClick={() => onWeekChange(1)}
            disabled={currentWeek >= TOTAL_WEEKS}
          >
            <ChevronRight className="size-5" />
          </IconButton>
        </div>

        <div className="flex border-t border-white/10">
          {program.days.map((day) => {
            const complete = isDayComplete(day.day)
            const isActive = activeDay === day.day
            return (
              <Button
                key={day.day}
                variant="ghost"
                onClick={() => setActiveDay(day.day)}
                className={cn(
                  "flex-1 h-auto py-3 flex flex-col items-center gap-1.5 transition-colors",
                  isActive ? "bg-white text-zinc-900" : "text-white/60"
                )}
              >
                <span className="text-xs font-bold tracking-widest uppercase">Day {day.day}</span>
                <div
                  className={cn(
                    "size-4 rounded-full flex items-center justify-center",
                    isActive
                      ? complete
                        ? "text-destructive"
                        : "text-zinc-400"
                      : complete
                        ? "text-destructive"
                        : "text-white/30"
                  )}
                >
                  {complete ? (
                    <CheckCircle2 className="size-4" strokeWidth={2.5} />
                  ) : (
                    <div className={cn("size-3.5 rounded-full border-2", isActive ? "border-zinc-400" : "border-white/30")} />
                  )}
                </div>
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
        {isDayComplete(activeDay) && (
          <div className="rounded-xl bg-card border border-border/60 p-4 text-center shadow-sm">
            <p className="font-bold text-lg">Session Complete</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
              {completedSessions
                .filter((cs) => cs.day === activeDay)
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
                ?.completedAt
                ? `Completed ${new Date(
                    completedSessions
                      .filter((cs) => cs.day === activeDay)
                      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
                      .completedAt
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : ""}
            </p>
          </div>
        )}

        {currentDay.sessions.map((session) => {
          const completed = getCompletedSession(session.id, activeDay)
          const isCompleted = !!completed
          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session, activeDay)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectSession(session, activeDay)
                }
              }}
              role="button"
              tabIndex={0}
              className="w-full text-left rounded-2xl bg-card/80 backdrop-blur border border-border/50 p-5 shadow-sm hover:shadow-md transition-shadow space-y-2 cursor-pointer select-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {session.type === "workout" ? (
                    <Zap className="size-4 text-sky-500 fill-sky-500" />
                  ) : (
                    <Target className="size-4 text-destructive" />
                  )}
                  <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                    {session.type}
                  </span>
                </div>
                {isCompleted && (
                  <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="size-3" />
                    FINISHED
                  </span>
                )}
              </div>

              <p className="font-extrabold text-lg tracking-tight text-foreground leading-tight">
                {session.name}
              </p>

              {isCompleted && completed ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Duration" value={formatDuration(completed.durationSeconds)} />
                  <StatTile label="Completed" value={`${completed.percentComplete}%`} tone="success" />
                  <Button
                    variant="link"
                    className="col-span-2 flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground px-0"
                    onClick={(e) => { e.stopPropagation(); onSelectSession(session, activeDay) }}
                  >
                    View Summary
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <div className="size-2 rounded-full bg-sky-500" />
                    <span className="text-xs font-semibold">NOT STARTED</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    <span className="text-xs font-semibold">{session.duration} MIN</span>
                  </span>
                </div>
              )}
            </div>
          )
        })}

        <Section title="Add Activity" description="Choose your training focus." className="pt-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Activity, label: "Solo Foot", color: "text-sky-500", action: "solo" as const },
              { icon: Target, label: "Duo Foot", color: "text-destructive", action: "duo" as const },
              { icon: Zap, label: "Club Training", color: "text-amber-500", action: "club" as const },
              { icon: Clock, label: "Warm Up", color: "text-emerald-500", action: null },
            ].map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                onClick={() => item.action && onNavigateToTraining?.(item.action)}
                className="h-auto flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/60 hover:bg-muted/60 transition-colors"
              >
                <item.icon className={cn("size-6", item.color)} />
                <span className="text-xs font-semibold text-muted-foreground text-center">{item.label}</span>
              </Button>
            ))}
          </div>
        </Section>

        {/* Heart Rate Monitor shortcut */}
        <Button
          onClick={() => onNavigateToHeartRate?.()}
          variant="ghost"
          className="w-full h-auto flex items-center gap-3 p-4 rounded-xl bg-card border border-border/60 hover:bg-muted/60 transition-colors justify-start"
        >
          <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <Heart className="size-5 text-red-500 fill-red-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Heart Rate Monitor</p>
            <p className="text-xs text-muted-foreground">Connect your BLE heart rate sensor</p>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground ml-auto shrink-0" />
        </Button>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>

      {/* AI Coach Chat Panel */}
      <AIChatPanel
        open={chatOpen}
        onOpenChange={setChatOpen}
        context={`Utilisateur: ${userName}\nSemaine actuelle: ${currentWeek}/12\nProgramme: ${program.week}\nSessions complétées: ${completedCount}`}
      />
    </Screen>
  )
}
