import { useState } from "react"
import { ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { regenerateWeek } from "@/lib/aiPlan/api"
import { isExtrapolatedWeek } from "@/lib/aiPlan/extrapolate"
import type { AIPlan, AIPlanWeek } from "@/lib/aiPlan/schema"

interface PlanWeeklyViewProps {
  plan: AIPlan
  onUpdatePlan: (next: AIPlan) => void
}

export function PlanWeeklyView({ plan, onUpdatePlan }: PlanWeeklyViewProps) {
  const [weekIdx, setWeekIdx] = useState(0)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const week = plan.weeks[weekIdx]
  const total = plan.weeks.length

  const handleRegenerate = async () => {
    if (regenerating) return
    setRegenerating(true)
    setError(null)
    try {
      const newWeek = await regenerateWeek(plan, week.week)
      const updatedWeeks: AIPlanWeek[] = plan.weeks.map((w) => (w.week === newWeek.week ? newWeek : w))
      onUpdatePlan({ ...plan, weeks: updatedWeeks })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de régénération")
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={weekIdx === 0}
          onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="flex-1 text-center">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
            Semaine {week.week} / {total}
          </p>
          <p className="font-extrabold text-base tracking-tight">{week.theme}</p>
          <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
            {week.deload && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                DELOAD
              </span>
            )}
            {isExtrapolatedWeek(week) && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-sky-600 bg-sky-50 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 px-2 py-0.5 rounded-full">
                AUTO-PROGRESS
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          disabled={weekIdx === total - 1}
          onClick={() => setWeekIdx((i) => Math.min(total - 1, i + 1))}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="text-xs"
        >
          {regenerating ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <RefreshCw className="size-3.5 mr-1" />}
          Régénérer cette semaine
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-3">
        {week.days.map((day) => (
          <div key={day.day} className={cn("rounded-xl border border-border/60 bg-card p-3 space-y-2")}>
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              {day.label}
            </p>
            {day.sessions.map((s) => (
              <div key={s.id} className="rounded-lg bg-muted/30 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm">{s.name}</p>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {s.durationMin} min
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{s.focus}</p>
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  {s.exercises.map((e, i) => (
                    <li key={i} className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold">{e.name}</span>
                      <span className="text-muted-foreground">
                        {e.sets ? `${e.sets}×` : ""}
                        {e.reps ?? ""}
                        {e.load ? ` · ${e.load}` : ""}
                        {e.rpe ? ` @RPE${e.rpe}` : ""}
                        {e.rest ? ` · ${e.rest}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
