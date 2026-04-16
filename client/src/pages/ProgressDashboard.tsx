import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { CompletedSession } from "@/lib/workoutData"
import { format, parseISO, startOfWeek } from "date-fns"
import { Button } from "@/components/ui/button"

interface ProgressDashboardProps {
  completedSessions: CompletedSession[]
  onBack?: () => void
}

/** Volume proxy: sum of duration × completion % per calendar week. */
export function ProgressDashboard({ completedSessions, onBack }: ProgressDashboardProps) {
  const rows = useMemo(() => {
    const byWeek = new Map<string, number>()
    for (const s of completedSessions) {
      const d = parseISO(s.completedAt)
      const wk = startOfWeek(d, { weekStartsOn: 1 })
      const key = format(wk, "yyyy-MM-dd")
      const minutes = (s.durationSeconds / 60) * (s.percentComplete / 100)
      byWeek.set(key, (byWeek.get(key) ?? 0) + minutes)
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, minutes]) => ({
        week: weekStart,
        minutes: Math.round(minutes),
      }))
  }, [completedSessions])

  return (
    <div className="min-h-svh bg-zinc-950 text-white p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack} className="text-sm text-zinc-400 hover:text-white hover:bg-transparent px-0">
            ← Retour
          </Button>
        )}
        <h1 className="text-lg font-semibold">Progression (minutes efficaces / semaine)</h1>
      </div>

      <div className="h-64 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500 p-4">Aucune séance terminée pour l’instant.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#e4e4e7" }}
              />
              <Bar dataKey="minutes" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Astuce: branche ce tableau sur <code className="text-zinc-400">/api/workouts/logs</code> quand tu synchronises
        les comptes — tu auras l’historique serveur, pas seulement le navigateur.
      </p>
    </div>
  )
}
