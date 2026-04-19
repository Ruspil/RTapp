import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  addFreshnessEntry,
  getFreshnessLog,
  type FreshnessEntry,
} from "@/lib/freshness"
import { getHrv7dAverage } from "@/lib/helioStrap"

interface FreshnessFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** HRV (ms) measured this morning from Helio Strap — read-only. */
  todaysHrv: number
  onSaved?: () => void
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FreshnessForm({ open, onOpenChange, todaysHrv, onSaved }: FreshnessFormProps) {
  const existing = getFreshnessLog().find((e) => e.date === todayKey())
  const [sleep, setSleep] = useState<number>(existing?.sleep ?? 7)
  const [stress, setStress] = useState<number>(existing?.stress ?? 3)
  const [fatigue, setFatigue] = useState<number>(existing?.fatigue ?? 3)
  /** 0 = symétrique, 10 = fort déséquilibre / inconfort G vs D */
  const [asymmetry, setAsymmetry] = useState<number>(existing?.asymmetry ?? 3)

  const save = () => {
    const entry: FreshnessEntry = {
      date: todayKey(),
      hrv: todaysHrv,
      hrvAvg7d: getHrv7dAverage(),
      sleep,
      stress,
      fatigue,
      asymmetry,
    }
    addFreshnessEntry(entry)
    onSaved?.()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Récup du matin</SheetTitle>
          <SheetDescription>
            Complète ton ressenti — ton HRV ({todaysHrv} ms) a déjà été mesuré via ton Helio Strap.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex items-center gap-3">
            <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Heart className="size-5 text-red-400 fill-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                HRV du jour (RMSSD)
              </p>
              <p className="text-xl font-black tabular-nums text-white">{todaysHrv} <span className="text-sm text-zinc-500">ms</span></p>
            </div>
          </div>

          <ScoreSlider
            id="sleep"
            label="Qualité du sommeil"
            value={sleep}
            setValue={setSleep}
            hintLow="Très mauvais"
            hintHigh="Excellent"
          />
          <ScoreSlider
            id="stress"
            label="Niveau de stress"
            value={stress}
            setValue={setStress}
            hintLow="Calme"
            hintHigh="Très stressé"
          />
          <ScoreSlider
            id="fatigue"
            label="Fatigue ressentie"
            value={fatigue}
            setValue={setFatigue}
            hintLow="Fraîcheur"
            hintHigh="Épuisé"
          />
          <ScoreSlider
            id="asymmetry"
            label="Asymétrie / inconfort latéral (gauche vs droite)"
            value={asymmetry}
            setValue={setAsymmetry}
            hintLow="Symétrique / RAS"
            hintHigh="Fort déséquilibre"
          />
        </div>

        <Button
          className="w-full mt-6 h-11 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold"
          onClick={save}
        >
          Calculer mon Freshness Score
        </Button>
      </SheetContent>
    </Sheet>
  )
}

function ScoreSlider({
  id,
  label,
  value,
  setValue,
  hintLow,
  hintHigh,
}: {
  id: string
  label: string
  value: number
  setValue: (n: number) => void
  hintLow: string
  hintHigh: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-bold">{label}</Label>
        <span className="text-lg font-black tabular-nums text-white">{value}<span className="text-xs text-zinc-500">/10</span></span>
      </div>
      <Slider
        id={id}
        min={0}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(vals) => setValue(vals[0] ?? value)}
      />
      <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wide">
        <span>{hintLow}</span>
        <span>{hintHigh}</span>
      </div>
    </div>
  )
}
