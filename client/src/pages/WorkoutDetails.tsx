import { ChevronLeft, MoveHorizontal as MoreHorizontal, Zap, Target, Clock, Dumbbell, PersonStanding, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Session } from "@/lib/workoutData"
import { ExerciseDemoVideo } from "@/components/ExerciseDemoVideo"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/app/Screen"
import { StatTile } from "@/components/app/StatTile"

interface WorkoutDetailsProps {
  session: Session
  day?: number
  onBack: () => void
  onStart: () => void
}

function ExerciseIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes("pull") || lower.includes("row") || lower.includes("slam")) {
    return <Activity className="size-5 text-muted-foreground" />
  }
  if (lower.includes("squat") || lower.includes("step") || lower.includes("jump") || lower.includes("lunge")) {
    return <PersonStanding className="size-5 text-muted-foreground" />
  }
  return <Dumbbell className="size-5 text-muted-foreground" />
}

export function WorkoutDetails({ session, onBack, onStart }: WorkoutDetailsProps) {
  const groups = Array.from(new Set(session.exercises.map((e) => e.group))).sort()

  return (
    <Screen className="bg-background flex flex-col">
      <header className="bg-background border-b border-border/60 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14">
          <Button onClick={onBack} variant="ghost" size="icon" className="p-1 -ml-1">
            <ChevronLeft className="size-6 text-foreground" />
          </Button>
          <span className="font-black text-sm tracking-widest uppercase">Details</span>
          <Button type="button" variant="ghost" size="icon" className="p-1 -mr-1">
            <MoreHorizontal className="size-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            {session.type === "workout" ? (
              <Zap className="size-4 text-sky-500 fill-sky-500" />
            ) : (
              <Target className="size-4 text-destructive" />
            )}
            <span className="text-xs font-black tracking-widest uppercase text-muted-foreground">
              {session.type}
            </span>
          </div>

          <h1 className="font-extrabold text-2xl tracking-tight text-foreground leading-tight">
            {session.name}
          </h1>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label="Status" value="Not started" />
            <StatTile label="Duration" value={`${session.duration} min`} />
          </div>
        </div>

        <div className="bg-muted/40 flex-1">
          {groups.map((group) => {
            const groupExercises = session.exercises.filter((e) => e.group === group)
            return (
              <div key={group} className="mb-2">
                <div className="px-5 py-3">
                  <h2 className="font-extrabold text-base tracking-tight">Group {group}</h2>
                </div>
                <div className="bg-background">
                  {groupExercises.map((exercise, idx) => {
                    const isLast = idx === groupExercises.length - 1
                    return (
                      <div
                        key={exercise.id}
                        className={cn(
                          "flex items-center gap-4 px-5 py-3.5",
                          !isLast && "border-b border-border/60"
                        )}
                      >
                        <div className="size-12 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                          <ExerciseIcon name={exercise.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground leading-tight">{exercise.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {exercise.weight} x {exercise.reps} {exercise.repsLabel.toLowerCase()}
                          </p>
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
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/30 px-5 py-4 max-w-lg mx-auto">
        <Button
          onClick={onStart}
          className="w-full py-4 h-auto rounded-full text-white font-bold text-base tracking-wide"
          style={{
            background: "linear-gradient(to right, #ef4444, #f97316)",
          }}
        >
          Start {session.type === "workout" ? "Workout" : "Primer"}
        </Button>
      </div>
    </Screen>
  )
}
