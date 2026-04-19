import { planLengthLabel, type AIPlanInputs } from "@/lib/aiPlan/schema"

const goalLabels: Record<string, string> = {
  strength: "Force",
  power: "Puissance",
  hypertrophy: "Hypertrophie",
  endurance: "Endurance",
  "fat-loss": "Perte de gras",
  "sport-specific": "Spécifique sport",
  "general-fitness": "Forme générale",
}

const equipmentLabels: Record<string, string> = {
  bodyweight: "Poids du corps",
  "full-gym": "Salle de gym",
  "cardio-machines": "Cardio",
}

const sportLabels: Record<string, string> = {
  football: "Football",
  running: "Running",
  gym: "Salle",
  basketball: "Basket",
  cycling: "Vélo",
  other: "Autre",
  none: "Aucun",
}

interface PlanReviewSummaryProps {
  inputs: AIPlanInputs
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export function PlanReviewSummary({ inputs }: PlanReviewSummaryProps) {
  const sport = inputs.sport === "other" ? inputs.sportFreeText || "Autre" : sportLabels[inputs.sport] ?? inputs.sport
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5">
      <h3 className="font-extrabold text-base tracking-tight">Résumé</h3>

      <div className="space-y-1.5">
        <Row label="Profil" value={`${inputs.sex === "male" ? "H" : inputs.sex === "female" ? "F" : "—"} · ${inputs.age} ans · ${inputs.heightValue}${inputs.heightUnit} · ${inputs.weightValue}${inputs.weightUnit}`} />
        <Row label="Expérience" value={inputs.experience} />
        <Row label="Sport" value={sport} />
        {inputs.sport === "football" && inputs.footballPosition && (
          <Row label="Poste" value={inputs.footballPosition} />
        )}
        {inputs.dominantFoot && <Row label="Pied fort" value={inputs.dominantFoot} />}

        <Row label="Objectif principal" value={goalLabels[inputs.primaryGoal] ?? inputs.primaryGoal} />
        {inputs.secondaryGoals.length > 0 && (
          <Row
            label="Objectifs secondaires"
            value={inputs.secondaryGoals.map((g) => goalLabels[g] ?? g).join(", ")}
          />
        )}

        <Row label="Équipement" value={inputs.equipment.map((e) => equipmentLabels[e] ?? e).join(", ")} />
        <Row label="Séance max" value={`${inputs.sessionLengthMin} min`} />
        {inputs.injuries && <Row label="Blessures / notes" value={inputs.injuries} />}

        <Row label="Jours / semaine" value={String(inputs.daysPerWeek)} />
        <Row label="Durée du plan" value={planLengthLabel(inputs.planLength)} />
        {inputs.freshnessHint && (
          <Row
            label="Helio Strap"
            value={`HRV jour: ${inputs.freshnessHint.hrvToday ?? "—"}ms · 7j: ${inputs.freshnessHint.hrv7dAvg ?? "—"}ms`}
          />
        )}
      </div>
    </div>
  )
}
