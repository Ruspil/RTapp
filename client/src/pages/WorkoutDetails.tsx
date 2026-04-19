import {
  ChevronLeft,
  Zap,
  Target,
  Clock,
  Dumbbell,
  PersonStanding,
  Activity,
  Play,
} from "lucide-react"
import { type Session } from "@/lib/workoutData"
import { ExerciseDemoVideo } from "@/components/ExerciseDemoVideo"

interface WorkoutDetailsProps {
  session: Session
  day?: number
  onBack: () => void
  onStart: () => void
}

function ExerciseIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes("pull") || lower.includes("row") || lower.includes("slam")) {
    return <Activity className="size-5 text-white/70" />
  }
  if (
    lower.includes("squat") ||
    lower.includes("step") ||
    lower.includes("jump") ||
    lower.includes("lunge")
  ) {
    return <PersonStanding className="size-5 text-white/70" />
  }
  return <Dumbbell className="size-5 text-white/70" />
}

export function WorkoutDetails({ session, onBack, onStart }: WorkoutDetailsProps) {
  const groups = Array.from(new Set(session.exercises.map((e) => e.group))).sort()
  const totalSets = session.exercises.reduce((acc, e) => acc + e.sets, 0)

  return (
    <div className="nk-page">
      {/* Top bar */}
      <header className="nk-topbar">
        <button
          type="button"
          onClick={onBack}
          className="nk-icon-btn"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="nk-eyebrow text-white/40">Session Brief</span>
        <span className="size-9" aria-hidden />
      </header>

      {/* Hero */}
      <section className="px-6 pt-2">
        <div className="flex items-center gap-2 mb-3">
          {session.type === "workout" ? (
            <Zap className="size-4" />
          ) : (
            <Target className="size-4" />
          )}
          <span className="nk-eyebrow">{session.type}</span>
        </div>
        <h1 className="nk-h-display line-clamp-3">{session.name}</h1>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="nk-stat">
            <span className="nk-stat-label">Time</span>
            <span className="nk-stat-value nk-num">{session.duration}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              min
            </span>
          </div>
          <div className="nk-stat">
            <span className="nk-stat-label">Exercises</span>
            <span className="nk-stat-value nk-num">
              {session.exercises.length}
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              moves
            </span>
          </div>
          <div className="nk-stat">
            <span className="nk-stat-label">Sets</span>
            <span className="nk-stat-value nk-num">{totalSets}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              total
            </span>
          </div>
        </div>

        {/* Primary CTA — right under the hero so it's always above the fold */}
        <div className="mt-5">
          <button type="button" onClick={onStart} className="nk-cta">
            <Play className="size-4 fill-current" />
            Start {session.type === "workout" ? "Workout" : "Primer"}
            <span className="nk-num font-extrabold opacity-70 ml-1">
              · {session.duration} min
            </span>
          </button>
        </div>
      </section>

      {/* Groups & exercises */}
      <section className="nk-stack-lg pt-32">
        <h2 className="nk-h-section">The Plan</h2>
        <div className="flex flex-col gap-6">
          {groups.map((group) => {
            const groupExercises = session.exercises.filter(
              (e) => e.group === group,
            )
            return (
              <div key={group} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="nk-eyebrow text-white/40">
                    Group {group}
                  </span>
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="nk-eyebrow text-white/30 nk-num">
                    {groupExercises.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {groupExercises.map((exercise) => (
                    <div key={exercise.id} className="nk-card p-4">
                      <div className="flex items-start gap-4">
                        <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <ExerciseIcon name={exercise.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-sm leading-tight">
                            {exercise.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="nk-chip nk-num">
                              {exercise.sets}
                              <span className="opacity-60">×</span>
                              {exercise.reps}
                            </span>
                            <span className="nk-chip">
                              {exercise.repsLabel}
                            </span>
                            {exercise.weight && exercise.weight !== "BW" && (
                              <span className="nk-chip nk-num">
                                {exercise.weight}
                                {exercise.weightUnit}
                              </span>
                            )}
                            {exercise.weight === "BW" && (
                              <span className="nk-chip">BW</span>
                            )}
                          </div>
                          {exercise.notes && (
                            <p className="text-[12px] text-white/55 leading-snug mt-3 border-l border-white/15 pl-3 whitespace-pre-line">
                              {exercise.notes}
                            </p>
                          )}
                          {exercise.demoVideoUrl && (
                            <div className="mt-3 -mx-1">
                              <ExerciseDemoVideo
                                videoUrl={exercise.demoVideoUrl}
                                title={exercise.name}
                                compact
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
