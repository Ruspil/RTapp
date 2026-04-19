/**
 * Plan cardio — plan_elite_lateral_v2 (12 semaines)
 * Source unique pour les séances cardio (lundi–vendredi).
 *
 * Zones FC (référence) :
 * - Z1 : < 60 % FCM
 * - Z2 : 60–70 %
 * - Z3 : 70–80 %
 * - Z4 : 80–90 %
 * - Z5 : > 90 %
 */

/** Aligné sur WorkoutExercise (sans id) — évite import circulaire avec workoutData */
export type CardioExerciseTemplate = {
  name: string
  weight: string
  weightUnit: string
  reps: string
  repsLabel: string
  sets: number
  group: number
  restSeconds: number
  muscles: string[]
  notes?: string
}

export type CardioDayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday"

export interface CardioSessionSpec {
  name: string
  description: string
  zone: string
  /** Libellé durée affiché (ex. « 30-35 min ») */
  duration: string
  /** Durée numérique pour l’en-tête séance (minutes) */
  durationMinutes: number
  recovery?: string
  phaseLabel?: string
  /**
   * Bloc d’exercices : jour 100 % cardio = liste complète ;
   * jour mixte gym+cardio = un seul exercice (remplace le slot cardio du template).
   */
  exercises: CardioExerciseTemplate[]
}

/** Date de début officielle du macrocycle (semaine 1 = semaine contenant ce lundi UTC). */
export const PROGRAM_START_ISO = "2026-05-04"

const PROGRAM_START_KEY = "trainhard-program-start-iso"

export function getProgramStartDateIso(): string {
  if (typeof localStorage === "undefined") return PROGRAM_START_ISO
  try {
    const o = localStorage.getItem(PROGRAM_START_KEY)
    return o && /^\d{4}-\d{2}-\d{2}$/.test(o) ? o : PROGRAM_START_ISO
  } catch {
    return PROGRAM_START_ISO
  }
}

export function setProgramStartDateIso(iso: string): void {
  try {
    localStorage.setItem(PROGRAM_START_KEY, iso)
  } catch {
    /* ignore */
  }
}

/** Lundi 00:00 UTC de la semaine contenant `d` */
function weekStartMondayUtc(d: Date): number {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = x.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  x.setUTCDate(x.getUTCDate() + diff)
  return x.getTime()
}

/**
 * Semaine programme 1–12 à partir d’une date de début (lundi du cycle) et d’aujourd’hui.
 * Avant le début : semaine 1. Après S12 : plafonné à 12.
 */
export function getProgramWeekFromStart(today: Date = new Date(), startIso = getProgramStartDateIso()): number {
  const [y, m, day] = startIso.split("-").map(Number)
  const start = Date.UTC(y, m - 1, day)
  const t0 = weekStartMondayUtc(today)
  if (t0 < start) return 1
  const diffMs = t0 - start
  const weekIndex = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.min(12, Math.max(1, weekIndex))
}

/* -------------------------------------------------------------------------- */
/* Helpers exercices (sans id — injectés dans workoutData avec suffixe semaine) */

const BW = "" as const

function ex(p: CardioExerciseTemplate): CardioExerciseTemplate {
  return p
}

/** Phase 1 — S1 à S3 */
const P1_MON = (): CardioExerciseTemplate[] => [
  ex({
    name: "Le Tour du Propriétaire",
    weight: "BW",
    weightUnit: BW,
    reps: "20-25",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Trot très léger autour du terrain, allure conversationnelle — Zone FC: Z2",
  }),
]

const P1_TUE = (): CardioExerciseTemplate[] => [
  ex({
    name: "Box-to-Box du Diable — 400 m",
    weight: "BW",
    weightUnit: BW,
    reps: "1",
    repsLabel: "400 m",
    sets: 10,
    group: 1,
    restSeconds: 60,
    muscles: ["Cardio", "Jambes"],
    notes: `🏃‍♂️ Sprint 400 m (4 longueurs de terrain) à 90–95 % de ton max
🚶 Marche/trot 100 m (1 longueur de terrain) — récupération active
⏱️ 60 secondes de repos complet
10 fois`,
  }),
]

const P1_WED = (): CardioExerciseTemplate[] => [
  ex({
    name: "Le Décrassage",
    weight: "BW",
    weightUnit: BW,
    reps: "25-30",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Mobilité + course très lente — Zone FC: Z1–Z2",
  }),
]

const P1_THU = (): CardioExerciseTemplate[] => [
  ex({
    name: "Échauffement",
    weight: "BW",
    weightUnit: BW,
    reps: "15",
    repsLabel: "MINUTES",
    sets: 1,
    group: 1,
    restSeconds: 0,
    muscles: ["Cardio", "Jambes"],
    notes:
      "Progressif : mobilisation puis montée douce. Résumé de la séance à venir : 4 × 8 min de navettes « ligne de touche à ligne de touche » en course soutenue (tu vas d’une ligne à l’autre puis tu reviens, sans t’arrêter pendant chaque bloc de 8 min) ; 3 min de marche/trot léger entre chaque bloc — viser Z4 (80–90 %).",
  }),
  ex({
    name: "Les Navettes de ligne à ligne",
    weight: "BW",
    weightUnit: BW,
    reps: "8",
    repsLabel: "MINUTES",
    sets: 4,
    group: 1,
    restSeconds: 180,
    muscles: ["Cardio", "Jambes"],
    notes:
      "4 × 8 min : enchaîne en course soutenue d’une ligne de touche à l’autre puis retour, sans t’arrêter pendant le bloc. Récupération : 3 min de marche ou trot léger entre chaque bloc de 8 min. Zone FC : Z4 (80–90 %).",
  }),
]

const P1_FRI = (): CardioExerciseTemplate[] => [
  ex({
    name: "Le Petit Galop",
    weight: "BW",
    weightUnit: BW,
    reps: "20-25",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Dont 15 min à allure plus rapide — Zone FC: Z2–Z3",
  }),
]

/** Décharge S4 & S8 — lundi optionnel très léger */
const D_MON = (): CardioExerciseTemplate[] => [
  ex({
    name: "Cardio très léger (optionnel)",
    weight: "BW",
    weightUnit: BW,
    reps: "15-20",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Récupération active très courte si souhaité — Zone FC: Z1",
  }),
]

const D4_TUE = (): CardioExerciseTemplate[] => [
  ex({
    name: "400 m — volume réduit (décharge)",
    weight: "BW",
    weightUnit: BW,
    reps: "5",
    repsLabel: "RÉPÉTITIONS",
    sets: 5,
    group: 1,
    restSeconds: 60,
    muscles: ["Cardio", "Jambes"],
    notes: "5 × 400 m à ~85 %. Zone FC: Z4–Z5",
  }),
]

const D4_WED = (): CardioExerciseTemplate[] => [
  ex({
    name: "Cardio doux",
    weight: "BW",
    weightUnit: BW,
    reps: "15",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Zone FC: Z1 uniquement",
  }),
]

const D4_THU = (palier: string, kmh: string): CardioExerciseTemplate[] => [
  ex({
    name: `Navettes 20 m — Palier ${palier} (${kmh} km/h)`,
    weight: "BW",
    weightUnit: BW,
    reps: "3",
    repsLabel: "MINUTES",
    sets: 4,
    group: 1,
    restSeconds: 180,
    muscles: ["Cardio", "Jambes"],
    notes: "4 × 3 min — Récupération 3 min entre sets — Zone FC: Z3",
  }),
]

const D4_FRI = (): CardioExerciseTemplate[] => [
  ex({
    name: "Cardio doux",
    weight: "BW",
    weightUnit: BW,
    reps: "20",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Zone FC: Z1–Z2",
  }),
]

/** Phase 2 — S5–S7 */
const P2_MON = (): CardioExerciseTemplate[] => [
  ex({
    name: "L’Explorateur",
    weight: "BW",
    weightUnit: BW,
    reps: "25-30",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Course à allure modérée, varier les surfaces si possible — Zone FC: Z2",
  }),
]

const P2_TUE = (): CardioExerciseTemplate[] => [
  ex({
    name: "Sprints du Latéral — RSA Vitesse",
    weight: "BW",
    weightUnit: BW,
    reps: "6",
    repsLabel: "SPRINTS × 2 séries",
    sets: 2,
    group: 1,
    restSeconds: 240,
    muscles: ["Cardio", "Jambes"],
    notes: `2 séries de 6 sprints de 50 m à vitesse maximale (Z5+). Récupération : 20 s entre sprints, 4 min entre séries.

Repère 50 m : environ 40 pas au sol, ou la moitié de la longueur d’un terrain de foot (d’un but à l’autre).`,
  }),
]

const P2_WED = P1_WED

const P2_THU_56 = (): CardioExerciseTemplate[] => [
  ex({
    name: "Beep Test Builder Phase 2 — Navettes 20 m",
    weight: "BW",
    weightUnit: BW,
    reps: "3",
    repsLabel: "MINUTES",
    sets: 6,
    group: 1,
    restSeconds: 150,
    muscles: ["Cardio", "Jambes"],
    notes: `6 × 3 min à paliers 12–13 (9,6–10,4 km/h). Récupération 2 min 30 entre sets — Zone FC: Z4

Repère 20 m : environ 18 pas au sol.`,
  }),
]

const P2_THU_7 = (): CardioExerciseTemplate[] => [
  ex({
    name: "Beep Test Builder Phase 2 — Semaine pic (S7)",
    weight: "BW",
    weightUnit: BW,
    reps: "3",
    repsLabel: "MINUTES",
    sets: 5,
    group: 1,
    restSeconds: 180,
    muscles: ["Cardio", "Jambes"],
    notes: `5 × 3 min à palier 12 (9,6 km/h). Récupération 3 min entre sets — Zone FC: Z4

Repère 20 m : environ 18 pas au sol.`,
  }),
]

const P2_FRI = (): CardioExerciseTemplate[] => [
  ex({
    name: "Le Fond de Jeu",
    weight: "BW",
    weightUnit: BW,
    reps: "25-30",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Course stable, allure confortable — Zone FC: Z2",
  }),
]

const D8_TUE = (): CardioExerciseTemplate[] => [
  ex({
    name: "Sprints 50 m — volume réduit (décharge)",
    weight: "BW",
    weightUnit: BW,
    reps: "4",
    repsLabel: "SPRINTS × 3 séries",
    sets: 3,
    group: 1,
    restSeconds: 300,
    muscles: ["Cardio", "Jambes"],
    notes: "3 séries de 4 sprints de 50 m. Récupération 30 s entre sprints, 5 min entre séries — Zone FC: Z4–Z5",
  }),
]

/** Phase 3 — S9–S11 */
const P3_MON = (): CardioExerciseTemplate[] => [
  ex({
    name: "La Mise en Jambes",
    weight: "BW",
    weightUnit: BW,
    reps: "15-20",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Trot très facile — Zone FC: Z1–Z2",
  }),
]

const P3_TUE = (): CardioExerciseTemplate[] => [
  ex({
    name: "Rappel du Moteur — Vitesse maximale",
    weight: "BW",
    weightUnit: BW,
    reps: "5",
    repsLabel: "RÉPÉTITIONS",
    sets: 5,
    group: 1,
    restSeconds: 120,
    muscles: ["Cardio", "Jambes"],
    notes: "5 × 300 m à vitesse maximale (Z5). Récupération : 2 min de marche très lente entre les répétitions",
  }),
]

const P3_WED = (): CardioExerciseTemplate[] => [
  ex({
    name: "La Souplesse du Félin",
    weight: "BW",
    weightUnit: BW,
    reps: "15-20",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Souplesse dynamique (hanches, adducteurs) — Zone FC: Z1",
  }),
]

const P3_THU = (): CardioExerciseTemplate[] => [
  ex({
    name: "Beep Test Builder Phase 3 — Navettes 20 m",
    weight: "BW",
    weightUnit: BW,
    reps: "4",
    repsLabel: "MINUTES",
    sets: 5,
    group: 1,
    restSeconds: 120,
    muscles: ["Cardio", "Jambes"],
    notes:
      "5 × 4 min à paliers 13–14 (10,4–11,1 km/h). Récupération 2 min entre sets — Zone FC: Z4–Z5",
  }),
]

const P3_FRI = (): CardioExerciseTemplate[] => [
  ex({
    name: "L’Allumage",
    weight: "BW",
    weightUnit: BW,
    reps: "15-20",
    repsLabel: "MINUTES",
    sets: 1,
    group: 4,
    restSeconds: 0,
    muscles: ["Cardio"],
    notes: "Facile + 4 accélérations progressives sur 50 m — Zone FC: Z2",
  }),
]

const S12_THU = (): CardioExerciseTemplate[] => [
  ex({
    name: "Réchauffement — jogging",
    weight: "BW",
    weightUnit: BW,
    reps: "15",
    repsLabel: "MINUTES",
    sets: 1,
    group: 1,
    restSeconds: 0,
    muscles: ["Cardio", "Jambes"],
    notes: "Jogging facile pour monter en température — Zone FC: Z1–Z2",
  }),
  ex({
    name: "Fartlek spécifique football",
    weight: "BW",
    weightUnit: BW,
    reps: "15",
    repsLabel: "MINUTES",
    sets: 1,
    group: 1,
    restSeconds: 0,
    muscles: ["Cardio", "Jambes"],
    notes: `Bloc fartlek : 15 min — dernier stimulus haute intensité (J-7 avant test). Pas de navettes — Zone FC: Z4–Z5

3 blocs : enchaîne 3 fois la séquence suivante (une « longueur » = une fois la longueur du terrain, but à but) :
Sprint 1 longueur
Marche ½ longueur
Course rapide 1 longueur`,
  }),
]

function wrap(
  name: string,
  description: string,
  zone: string,
  duration: string,
  durationMinutes: number,
  exercises: CardioExerciseTemplate[],
  extra?: Partial<CardioSessionSpec>,
): CardioSessionSpec {
  return {
    name,
    description,
    zone,
    duration,
    durationMinutes,
    exercises,
    ...extra,
  }
}

/** Données brutes par semaine (1–12) et jour */
function rawSpec(week: number, day: CardioDayKey): CardioSessionSpec | null {
  // Phase 1 — S1–S3
  if (week <= 3) {
    if (day === "monday")
      return wrap(
        "Le Tour du Propriétaire",
        "Trot très léger autour du terrain",
        "Z2",
        "20-25 min",
        23,
        P1_MON(),
        { phaseLabel: "Phase 1 — Construire ton moteur" },
      )
    if (day === "tuesday")
      return wrap(
        "Box-to-Box du Diable",
        "10 × 400 m : sprint 4 L, récup 100 m active, 60 s repos",
        "Z5",
        "≈ 35-40 min",
        40,
        P1_TUE(),
        {
          phaseLabel: "Phase 1 — Construire ton moteur",
          recovery: "100 m marche/trot + 60 s repos complet entre chaque 400 m",
        },
      )
    if (day === "wednesday")
      return wrap(
        "Le Décrassage",
        "Mobilité + course très lente",
        "Z1–Z2",
        "25-30 min",
        28,
        P1_WED(),
        { phaseLabel: "Phase 1 — Construire ton moteur" },
      )
    if (day === "thursday")
      return wrap(
        "Intense — Les Navettes de ligne à ligne",
        "Échauffement 15 min puis 4 × 8 min : ligne de touche à ligne de touche, aller-retour sans arrêt pendant chaque bloc ; 3 min marche/trot entre blocs",
        "Z4 (80–90 %)",
        "≈ 55-60 min",
        58,
        P1_THU(),
        {
          phaseLabel: "Phase 1 — Construire ton moteur",
          recovery: "3 min marche / trot léger entre chaque bloc de 8 min",
        },
      )
    if (day === "friday")
      return wrap(
        "Le Petit Galop",
        "Dont 15 min à allure plus rapide",
        "Z2–Z3",
        "20-25 min",
        23,
        P1_FRI(),
        { phaseLabel: "Phase 1 — Construire ton moteur" },
      )
  }

  // Décharge S4
  if (week === 4) {
    if (day === "monday")
      return wrap(
        "Cardio très léger (optionnel)",
        "Récupération active courte",
        "Z1",
        "15-20 min",
        18,
        D_MON(),
        { phaseLabel: "Décharge — Mod.1" },
      )
    if (day === "tuesday")
      return wrap(
        "Cardio réduit — 400 m",
        "Volume réduit vs semaines précédentes",
        "Z4–Z5",
        "≈ 30 min",
        30,
        D4_TUE(),
        { phaseLabel: "Décharge — Mod.1" },
      )
    if (day === "wednesday")
      return wrap("Cardio doux", "Uniquement en zone facile", "Z1", "15 min", 15, D4_WED(), {
        phaseLabel: "Décharge — Mod.1",
      })
    if (day === "thursday")
      return wrap(
        "Navettes allégées",
        "Palier 10 — volume réduit",
        "Z3",
        "≈ 35 min",
        35,
        D4_THU("10", "8,0"),
        { phaseLabel: "Décharge — Mod.1" },
      )
    if (day === "friday")
      return wrap("Cardio doux", "Récupération", "Z1–Z2", "20 min", 20, D4_FRI(), {
        phaseLabel: "Décharge — Mod.1",
      })
  }

  // Phase 2 — S5–S7
  if (week >= 5 && week <= 7) {
    if (day === "monday")
      return wrap(
        "L’Explorateur",
        "Course à allure modérée",
        "Z2",
        "25-30 min",
        28,
        P2_MON(),
        { phaseLabel: "Phase 2 — Devenir un chasseur" },
      )
    if (day === "tuesday")
      return wrap(
        "Sprints du Latéral — RSA Vitesse",
        "Sprints 50 m max — repère : ~40 pas ou ½ terrain but à but",
        "Z5+",
        "≈ 40 min",
        40,
        P2_TUE(),
        { phaseLabel: "Phase 2 — Devenir un chasseur" },
      )
    if (day === "wednesday")
      return wrap(
        "Le Décrassage",
        "Mobilité + course très lente",
        "Z1–Z2",
        "25-30 min",
        28,
        P2_WED(),
        { phaseLabel: "Phase 2 — Devenir un chasseur" },
      )
    if (day === "thursday") {
      const spec =
        week === 7
          ? wrap(
              "Beep Test Builder Phase 2 — Pic (S7)",
              "Navettes 20 m (~18 pas) — volume pic",
              "Z4",
              "≈ 40 min",
              40,
              P2_THU_7(),
              { phaseLabel: "Phase 2 — Pic" },
            )
          : wrap(
              "Beep Test Builder Phase 2",
              "Navettes 20 m (~18 pas) — paliers 12–13",
              "Z4",
              "≈ 45 min",
              45,
              P2_THU_56(),
              { phaseLabel: "Phase 2 — Devenir un chasseur" },
            )
      return spec
    }
    if (day === "friday")
      return wrap(
        "Le Fond de Jeu",
        "Course stable",
        "Z2",
        "25-30 min",
        28,
        P2_FRI(),
        { phaseLabel: "Phase 2 — Devenir un chasseur" },
      )
  }

  // Décharge S8
  if (week === 8) {
    if (day === "monday")
      return wrap(
        "Cardio très léger (optionnel)",
        "Récupération active",
        "Z1",
        "15-20 min",
        18,
        D_MON(),
        { phaseLabel: "Décharge — Mod.1" },
      )
    if (day === "tuesday")
      return wrap(
        "Sprints réduits — RSA",
        "Volume réduit",
        "Z4–Z5",
        "≈ 30 min",
        30,
        D8_TUE(),
        { phaseLabel: "Décharge — Mod.1" },
      )
    if (day === "wednesday")
      return wrap("Cardio doux", "Facile", "Z1", "20 min", 20, D4_WED().map((e) => ({ ...e, reps: "20" })), {
        phaseLabel: "Décharge — Mod.1",
      })
    if (day === "thursday")
      return wrap(
        "Navettes allégées",
        "Palier 11",
        "Z3",
        "≈ 35 min",
        35,
        D4_THU("11", "8,7"),
        { phaseLabel: "Décharge — Mod.1" },
      )
    if (day === "friday")
      return wrap("Cardio doux", "Récupération", "Z1–Z2", "20 min", 20, D4_FRI(), {
        phaseLabel: "Décharge — Mod.1",
      })
  }

  // Phase 3 — S9–S11
  if (week >= 9 && week <= 11) {
    if (day === "monday")
      return wrap(
        "La Mise en Jambes",
        "Trot facile",
        "Z1–Z2",
        "15-20 min",
        18,
        P3_MON(),
        { phaseLabel: "Phase 3 — Mode compétition" },
      )
    if (day === "tuesday")
      return wrap(
        "Rappel du Moteur — Vitesse maximale",
        "5 × 300 m",
        "Z5",
        "≈ 35 min",
        35,
        P3_TUE(),
        { phaseLabel: "Phase 3 — Mode compétition" },
      )
    if (day === "wednesday")
      return wrap(
        "La Souplesse du Félin",
        "Souplesse dynamique",
        "Z1",
        "15-20 min",
        18,
        P3_WED(),
        { phaseLabel: "Phase 3 — Mode compétition" },
      )
    if (day === "thursday")
      return wrap(
        "Beep Test Builder Phase 3",
        "Navettes 20 m — paliers 13–14",
        "Z4–Z5",
        "≈ 50 min",
        50,
        P3_THU(),
        { phaseLabel: "Phase 3 — Mode compétition" },
      )
    if (day === "friday")
      return wrap(
        "L’Allumage",
        "Facile + accélérations",
        "Z2",
        "15-20 min",
        18,
        P3_FRI(),
        { phaseLabel: "Phase 3 — Mode compétition" },
      )
  }

  // S12 — Taper
  if (week === 12) {
    if (day === "monday")
      return wrap(
        "La Mise en Jambes",
        "Trot facile",
        "Z1–Z2",
        "15-20 min",
        18,
        P3_MON(),
        { phaseLabel: "Tapering" },
      )
    if (day === "tuesday")
      return wrap(
        "Rappel du Moteur",
        "5 × 300 m — identique S9–11",
        "Z5",
        "≈ 35 min",
        35,
        P3_TUE(),
        { phaseLabel: "Tapering" },
      )
    if (day === "wednesday")
      return wrap(
        "La Souplesse du Félin",
        "Souplesse dynamique",
        "Z1",
        "15-20 min",
        18,
        P3_WED(),
        { phaseLabel: "Tapering" },
      )
    if (day === "thursday")
      return wrap(
        "Fartlek spécifique football",
        "15 min jogging + 15 min fartlek : 3 × (sprint 1 L + marche ½ L + course rapide 1 L)",
        "Z1–Z2 puis Z4–Z5",
        "≈ 30 min",
        30,
        S12_THU(),
        { phaseLabel: "Tapering — J-7" },
      )
    if (day === "friday")
      return wrap(
        "L’Allumage",
        "Facile + accélérations",
        "Z2",
        "15-20 min",
        18,
        P3_FRI(),
        { phaseLabel: "Tapering" },
      )
  }

  return null
}

export function getCardioSession(week: number, day: CardioDayKey): CardioSessionSpec | null {
  const w = Math.min(12, Math.max(1, Math.floor(week)))
  return rawSpec(w, day)
}

export function listCardioDaysForWeek(week: number): CardioDayKey[] {
  const keys: CardioDayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday"]
  return keys.filter((d) => getCardioSession(week, d) != null)
}

export function dayNumberToCardioKey(day: number): CardioDayKey | null {
  if (day < 1 || day > 5) return null
  return (["monday", "tuesday", "wednesday", "thursday", "friday"] as const)[day - 1]
}
