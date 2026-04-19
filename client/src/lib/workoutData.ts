import { getDemoVideoUrl } from "./exerciseDemoVideos"
import { dayNumberToCardioKey, getCardioSession } from "./cardioPlan"

export type SessionType = "workout" | "primer"

export interface WorkoutExercise {
  id: string
  name: string
  weight: string
  weightUnit: string
  reps: string
  repsLabel: string
  sets: number
  group: number
  restSeconds: number
  muscles?: string[]
  notes?: string
  /** MP4/WebM URL (e.g. /exercise-demos/move.mp4) — human demo of the movement */
  demoVideoUrl?: string
}

export interface Session {
  id: string
  type: SessionType
  name: string
  duration: number
  exercises: WorkoutExercise[]
}

export interface WorkoutDay {
  day: number
  sessions: Session[]
}

export interface Program {
  id: string
  ownerName: string
  name: string
  week: string
  totalWeeks: number
  days: WorkoutDay[]
}

export interface CompletedSession {
  sessionId: string
  day: number
  completedAt: string
  durationSeconds: number
  percentComplete: number
}

const COMPLETED_SESSIONS_KEY = "trainhard-completed"

/** Charge les sessions complétées depuis le même stockage que `App` (localStorage). */
export function loadCompletedSessionsFromStorage(): CompletedSession[] {
  try {
    const raw = localStorage.getItem(COMPLETED_SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as CompletedSession[]) : []
  } catch {
    return []
  }
}

export const TOTAL_WEEKS = 12

type WeekTemplate = { day: number; sessions: { id: string; type: SessionType; name: string; duration: number; exercises: WorkoutExercise[] }[] }[]

const s1_3_lundi: WeekTemplate[0] = {
  day: 1,
  sessions: [
    {
      id: "s13-mon-gym",
      type: "workout",
      name: "Force Bas du Corps + Abdos",
      duration: 60,
      exercises: [
        { id: "nordic-curl",    name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "Descente excentrique 3s, remontée assistée. TOUJOURS avant Back Squat" },
        { id: "back-squat",     name: "Back Squat",           weight: "70-75%", weightUnit: "1RM", reps: "6-8",  repsLabel: "REPS", sets: 4, group: 1, restSeconds: 120, muscles: ["Quads","Fessiers","Ischio-jambiers"], notes: "Focus sur la forme" },
        { id: "rdl",            name: "Romanian Deadlift",    weight: "Modéré", weightUnit: "",    reps: "8-10", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90,  muscles: ["Ischio-jambiers","Fessiers","Bas du dos"], notes: "Mouvement contrôlé" },
        { id: "box-jumps",      name: "Box Jumps",            weight: "BW",     weightUnit: "",    reps: "5-7",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 60,  muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur modérée, atterrissage doux et silencieux" },
        { id: "kb-swings",      name: "Kettlebell Swings",    weight: "Modéré", weightUnit: "",    reps: "10-12",repsLabel: "REPS", sets: 3, group: 2, restSeconds: 60,  muscles: ["Ischio-jambiers","Fessiers","Core"], notes: "Hanches explosives" },
        { id: "front-plank",    name: "Planche Frontale",     weight: "BW",     weightUnit: "",    reps: "45-60",repsLabel: "SECONDES", sets: 3, group: 3, restSeconds: 45, muscles: ["Core"] },
        { id: "russian-twists", name: "Russian Twists",       weight: "BW",     weightUnit: "",    reps: "15-20",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "side-plank",     name: "Side Plank",           weight: "BW",     weightUnit: "",    reps: "30-45",repsLabel: "SEC CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "z2-run",         name: "Le Tour du Propriétaire (Z2)", weight: "BW", weightUnit: "", reps: "20-25",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Trot très léger autour du terrain, allure conversationnelle" },
      ],
    },
  ],
}

const s1_3_mardi: WeekTemplate[0] = {
  day: 2,
  sessions: [
    {
      id: "s13-tue-cardio",
      type: "workout",
      name: "Box-to-Box du Diable (VO2max)",
      duration: 40,
      exercises: [
        { id: "sprint-400m", name: "Sprint 400m (4 Longueurs) × 10", weight: "BW", weightUnit: "", reps: "10", repsLabel: "REPS", sets: 10, group: 1, restSeconds: 60, muscles: ["Cardio","Jambes"], notes: "90-95% effort — Zone FC: Z5. Recup: marche 100m + 60s repos entre chaque" },
      ],
    },
  ],
}

const s1_3_mercredi: WeekTemplate[0] = {
  day: 3,
  sessions: [
    {
      id: "s13-wed-gym",
      type: "workout",
      name: "Force Haut du Corps & Agilité + Abdos",
      duration: 60,
      exercises: [
        { id: "lateral-lunge",       name: "Lateral Lunge",                weight: "30", weightUnit: "POUNDS", reps: "6-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 45, muscles: ["Quads","Fessiers","Adducteurs"], notes: "Léger à modéré. Commence à 30 lb et augmente si la technique reste propre." },
        { id: "lateral-bounds",      name: "Lateral Bounds",              weight: "BW",     weightUnit: "", reps: "6-8",  repsLabel: "REPS CHAQUE", sets: 3, group: 2, restSeconds: 60, muscles: ["Fessiers","Adducteurs","Quads"], notes: "Sauts latéraux explosifs" },
        { id: "broad-jumps",         name: "Broad Jumps",                 weight: "BW",     weightUnit: "", reps: "5-7",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Quads","Fessiers","Mollets"], notes: "Sauts en longueur maximaux" },
        { id: "mb-slams",            name: "Medicine Ball Slams",         weight: "Modéré", weightUnit: "", reps: "10-12",repsLabel: "REPS", sets: 3, group: 2, restSeconds: 60, muscles: ["Corps entier","Core","Épaules"], notes: "Mouvement explosif" },
        { id: "db-bench",            name: "Dumbbell Bench Press",        weight: "Modéré", weightUnit: "", reps: "10-12",repsLabel: "REPS", sets: 3, group: 2, restSeconds: 75, muscles: ["Pectoraux","Triceps","Épaules"] },
        { id: "lat-pulldown",        name: "Lat Pulldown",                weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Grand dorsal","Biceps"] },
        { id: "seated-cable-row",    name: "Seated Cable Row",            weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Milieu du dos","Biceps"] },
        { id: "leg-raises",          name: "Leg Raises",                  weight: "BW",     weightUnit: "", reps: "15-20",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 45, muscles: ["Abdos bas","Fléchisseurs hanche"], notes: "Jambes tendues, contrôle la descente" },
        { id: "side-plank-rotation", name: "Side Plank",                  weight: "BW",     weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "reverse-crunches",    name: "Crunchs Inversés",            weight: "BW",     weightUnit: "", reps: "15-20",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 45, muscles: ["Abdos bas"] },
        { id: "active-recovery",     name: "Récupération Active (Z1-Z2)", weight: "BW",     weightUnit: "", reps: "20-25",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Vélo tranquille, natation ou marche rapide. Bouger sans forcer" },
      ],
    },
  ],
}

const s1_3_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s13-thu-cardio",
      type: "workout",
      name: "Beep Test Builder — Navettes 20m [MOD.3]",
      duration: 45,
      exercises: [
        { id: "navettes-20m-p1", name: "Navettes 20m — Palier 11 (8,7 km/h)", weight: "BW", weightUnit: "", reps: "3", repsLabel: "MINUTES", sets: 6, group: 1, restSeconds: 180, muscles: ["Cardio","Jambes"], notes: "6 rép × 3min — Palier 11 Beep Test (8,7 km/h). Recup 3min entre sets. Zone FC: Z3-Z4" },
      ],
    },
  ],
}

const s1_3_vendredi: WeekTemplate[0] = {
  day: 5,
  sessions: [
    {
      id: "s13-fri-gym",
      type: "workout",
      name: "Plyométrie & Unilatéral + Abdos",
      duration: 60,
      exercises: [
        { id: "nordic-curl-fri",  name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "Même protocole que le lundi. Priorité absolue avant toute charge" },
        { id: "sl-box-jumps",     name: "Single-Leg Box Jumps",        weight: "BW",     weightUnit: "", reps: "4-6",  repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 60, muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur basse, atterrissage doux" },
        { id: "bulgarian-squats", name: "Bulgarian Split Squats",      weight: "Modéré", weightUnit: "", reps: "8-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 75, muscles: ["Quads","Fessiers","Ischio-jambiers"] },
        { id: "wall-sit-weight",  name: "Weighted Wall Sit",           weight: "Modéré", weightUnit: "", reps: "30-60",repsLabel: "SECONDES", sets: 3, group: 2, restSeconds: 90, muscles: ["Quads","Fessiers","Core"], notes: "Dos au mur, cuisses parallèles. Ajoute un poids sur les cuisses si possible." },
        { id: "pallof-press",     name: "Pallof Press",                weight: "Modéré", weightUnit: "", reps: "12-15",repsLabel: "REPS CHAQUE", sets: 3, group: 2, restSeconds: 60, muscles: ["Core","Obliques"], notes: "Anti-rotation du tronc" },
        { id: "plank-hip-dips",   name: "Plank + Hip Dips",            weight: "BW",     weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Obliques"] },
        { id: "wood-chops",       name: "Wood Chops",                  weight: "BW",     weightUnit: "", reps: "12-15",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core","Épaules"] },
        { id: "bird-dog",         name: "Bird-Dog",                    weight: "BW",     weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 30, muscles: ["Core","Fessiers","Bas du dos"], notes: "Lent et contrôlé" },
        { id: "petit-galop",      name: "Le Petit Galop (Z2-Z3)",      weight: "BW",     weightUnit: "", reps: "20-25",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "20-25min dont 15min à allure galop. Zone FC: Z2-Z3" },
      ],
    },
  ],
}

const s4_lundi: WeekTemplate[0] = {
  day: 1,
  sessions: [
    {
      id: "s4-mon-gym",
      type: "workout",
      name: "Gym Allégé — Décharge [MOD.1]",
      duration: 40,
      exercises: [
        { id: "nordic-curl",  name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "Maintenu — toujours avant Back Squat" },
        { id: "back-squat",   name: "Back Squat (60% 1RM)",    weight: "60%", weightUnit: "1RM", reps: "4", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 120, muscles: ["Quads","Fessiers"], notes: "Volume réduit -40%. Supprimer Box Jumps et KB Swings" },
        { id: "rdl",          name: "Romanian Deadlift (60%)", weight: "60%", weightUnit: "1RM", reps: "6", repsLabel: "REPS", sets: 2, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers","Fessiers"] },
        { id: "z1-walk",      name: "Cardio Doux (Z1-Z2)",     weight: "BW", weightUnit: "",    reps: "20-25",repsLabel: "MINUTES", sets: 1, group: 2, restSeconds: 0, muscles: ["Cardio"], notes: "Marche rapide ou trot très léger" },
      ],
    },
  ],
}

const s4_mardi: WeekTemplate[0] = {
  day: 2,
  sessions: [
    {
      id: "s4-tue-cardio",
      type: "workout",
      name: "Cardio Réduit — Décharge [MOD.1]",
      duration: 30,
      exercises: [
        { id: "sprint-400m-reduit", name: "Sprint 400m (4L) × 5 (85%)", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 5, group: 1, restSeconds: 60, muscles: ["Cardio","Jambes"], notes: "5 séries au lieu de 10 — 85% effort. Zone FC: Z4-Z5" },
      ],
    },
  ],
}

const s4_mercredi: WeekTemplate[0] = {
  day: 3,
  sessions: [
    {
      id: "s4-wed-gym",
      type: "workout",
      name: "Gym Réduit — Décharge [MOD.1]",
      duration: 35,
      exercises: [
        { id: "lateral-lunge",  name: "Lateral Lunge",        weight: "30", weightUnit: "POUNDS", reps: "6-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 45, muscles: ["Quads","Fessiers","Adducteurs"], notes: "Décharge: garde léger, amplitude contrôlée." },
        { id: "lateral-bounds", name: "Lateral Bounds",        weight: "BW", weightUnit: "", reps: "6", repsLabel: "REPS", sets: 2, group: 2, restSeconds: 90, muscles: ["Fessiers","Adducteurs"] },
        { id: "broad-jumps",    name: "Broad Jumps",           weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 2, group: 2, restSeconds: 90, muscles: ["Quads","Fessiers"] },
        { id: "db-bench",       name: "Dumbbell Bench Press",  weight: "Modéré", weightUnit: "", reps: "8", repsLabel: "REPS", sets: 2, group: 2, restSeconds: 90, muscles: ["Pectoraux","Épaules"] },
        { id: "lat-pulldown",   name: "Lat Pulldown",          weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Grand dorsal","Biceps"] },
        { id: "seated-cable-row", name: "Seated Cable Row",    weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Milieu du dos","Biceps"] },
        { id: "z1-cardio",      name: "Cardio Léger (Z1)",     weight: "BW", weightUnit: "", reps: "15", repsLabel: "MINUTES", sets: 1, group: 3, restSeconds: 0, muscles: ["Cardio"], notes: "15 min Z1 uniquement" },
      ],
    },
  ],
}

const s4_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s4-thu-cardio",
      type: "workout",
      name: "Navettes 20m Allégées — Décharge",
      duration: 35,
      exercises: [
        { id: "navettes-20m-s4", name: "Navettes 20m — Palier 10 (8,0 km/h)", weight: "BW", weightUnit: "", reps: "3", repsLabel: "MINUTES", sets: 4, group: 1, restSeconds: 180, muscles: ["Cardio","Jambes"], notes: "4 × 3min au lieu de 6 — Palier 10 (8,0 km/h). Recup 3min. Zone FC: Z3" },
      ],
    },
  ],
}

const s4_vendredi: WeekTemplate[0] = {
  day: 5,
  sessions: [
    {
      id: "s4-fri-gym",
      type: "workout",
      name: "Mobilité & Unilatéral Allégé — Décharge [MOD.1]",
      duration: 35,
      exercises: [
        { id: "nordic-curl-fri", name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 2, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"] },
        { id: "bulgarian-squats",name: "Bulgarian Split Squats (60%)", weight: "60%", weightUnit: "1RM", reps: "5", repsLabel: "REPS CHAQUE", sets: 2, group: 1, restSeconds: 90, muscles: ["Quads","Fessiers"], notes: "Pas de Sled Push cette semaine" },
        { id: "z1z2-cardio",     name: "Cardio Récup (Z1-Z2)",         weight: "BW", weightUnit: "",    reps: "20", repsLabel: "MINUTES", sets: 1, group: 2, restSeconds: 0, muscles: ["Cardio"] },
      ],
    },
  ],
}

const s5_7_lundi: WeekTemplate[0] = {
  day: 1,
  sessions: [
    {
      id: "s57-mon-gym",
      type: "workout",
      name: "Force Bas du Corps + Abdos",
      duration: 60,
      exercises: [
        { id: "nordic-curl",     name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "6-8", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "S5:3×6 / S6:3×7 / S7:3×8 — +1 rép par semaine. TOUJOURS avant Back Squat" },
        { id: "back-squat",      name: "Back Squat",           weight: "80-85%", weightUnit: "1RM", reps: "4-6",  repsLabel: "REPS", sets: 3, group: 1, restSeconds: 150, muscles: ["Quads","Fessiers","Ischio-jambiers"], notes: "Lourd, focus vitesse d'exécution. S7: réduit à 70% (MOD.4)" },
        { id: "rdl",             name: "Romanian Deadlift",    weight: "Modéré-Lourd", weightUnit: "", reps: "6-8", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 120, muscles: ["Ischio-jambiers","Fessiers","Bas du dos"], notes: "Contrôlé" },
        { id: "box-jumps",       name: "Box Jumps",            weight: "BW",     weightUnit: "",    reps: "4-6",  repsLabel: "REPS", sets: 4, group: 2, restSeconds: 90,  muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur élevée, atterrissage réactif" },
        { id: "kb-swings",       name: "Kettlebell Swings",    weight: "Lourd",  weightUnit: "",    reps: "8-10", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90,  muscles: ["Ischio-jambiers","Fessiers","Core"], notes: "Hanches très explosives" },
        { id: "plank-leg-raise", name: "Planche + Élévation Jambe/Bras", weight: "BW", weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Fessiers"] },
        { id: "oblique-crunches",name: "Oblique Crunches",     weight: "BW",     weightUnit: "",    reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques"] },
        { id: "hollow-body",     name: "Hollow Body Hold",     weight: "BW",     weightUnit: "",    reps: "30-45",repsLabel: "SECONDES", sets: 3, group: 3, restSeconds: 45, muscles: ["Core"] },
        { id: "explorateur-run", name: "L'Explorateur (Z2)",   weight: "BW",     weightUnit: "",    reps: "25-30",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Course allure modérée, varier les surfaces si possible" },
      ],
    },
  ],
}

const s5_7_mardi: WeekTemplate[0] = {
  day: 2,
  sessions: [
    {
      id: "s57-tue-cardio",
      type: "workout",
      name: "Sprints du Latéral — RSA Vitesse",
      duration: 40,
      exercises: [
        { id: "sprint-50m-rsa", name: "Sprint 50m Max — 2×6 séries", weight: "BW", weightUnit: "", reps: "6", repsLabel: "SPRINTS", sets: 2, group: 1, restSeconds: 240, muscles: ["Cardio","Jambes"], notes: "2 séries de 6 sprints 50m max. 20s repos entre sprints, 4min entre les 2 séries. Zone FC: Z5+" },
      ],
    },
  ],
}

const s5_7_mercredi: WeekTemplate[0] = {
  day: 3,
  sessions: [
    {
      id: "s57-wed-gym",
      type: "workout",
      name: "Force Haut du Corps & COD Réactif + Abdos",
      duration: 60,
      exercises: [
        { id: "lateral-lunge",       name: "Lateral Lunge",                  weight: "30", weightUnit: "POUNDS", reps: "6-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 45, muscles: ["Quads","Fessiers","Adducteurs"], notes: "Contrôle genou/cheville. Pousse fort pour revenir." },
        { id: "miroir-reactif",      name: "Miroir Réactif [MOD.5 Bloc B]",   weight: "BW", weightUnit: "", reps: "20",repsLabel: "SECONDES", sets: 3, group: 1, restSeconds: 40, muscles: ["Agilité","Jambes"], notes: "Réagir au déplacement partenaire 3-5m latéral. Phase 2: Blocs A+B actifs" },
        { id: "lateral-bounds",      name: "Lateral Bounds",              weight: "BW",          weightUnit: "", reps: "5-7",  repsLabel: "REPS CHAQUE", sets: 4, group: 2, restSeconds: 75, muscles: ["Fessiers","Adducteurs","Quads"], notes: "Plus loin, plus explosif" },
        { id: "broad-jumps",         name: "Broad Jumps",                 weight: "BW",          weightUnit: "", reps: "4-6",  repsLabel: "REPS", sets: 4, group: 2, restSeconds: 90, muscles: ["Quads","Fessiers","Mollets"] },
        { id: "mb-slams",            name: "Medicine Ball Slams",         weight: "Lourd",       weightUnit: "", reps: "8-10", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 75, muscles: ["Corps entier","Core","Épaules"], notes: "Très explosif" },
        { id: "db-bench",            name: "Dumbbell Bench Press",        weight: "Modéré-Lourd",weightUnit: "", reps: "8-10", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Pectoraux","Triceps","Épaules"] },
        { id: "lat-pulldown",        name: "Lat Pulldown",                weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Grand dorsal","Biceps"] },
        { id: "seated-cable-row",    name: "Seated Cable Row",            weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Milieu du dos","Biceps"] },
        { id: "side-plank-leg-raise",name: "Side Plank + Élévation Jambe",weight: "BW",          weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "v-ups",               name: "V-Ups",                       weight: "BW",          weightUnit: "", reps: "15-20",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 45, muscles: ["Abdos","Fléchisseurs hanche"] },
        { id: "russian-med-ball",    name: "Russian Twists (Med Ball)",   weight: "MB",          weightUnit: "", reps: "20-25",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "decrassage-run",      name: "Le Décrassage (Z1-Z2)",       weight: "BW",          weightUnit: "", reps: "25-30",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Mobilité + course très lente pour faire circuler le sang" },
      ],
    },
  ],
}

const s5_6_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s56-thu-cardio",
      type: "workout",
      name: "Beep Test Builder Phase 2 — Paliers 12-13 [MOD.3]",
      duration: 45,
      exercises: [
        { id: "navettes-20m-p2", name: "Navettes 20m — Paliers 12-13 (9,6-10,4 km/h)", weight: "BW", weightUnit: "", reps: "3", repsLabel: "MINUTES", sets: 6, group: 1, restSeconds: 150, muscles: ["Cardio","Jambes"], notes: "6 × 3min — Paliers 12-13. Recup 2min30 entre sets. Zone FC: Z4" },
      ],
    },
  ],
}

const s7_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s7-thu-cardio",
      type: "workout",
      name: "Beep Test Builder S7 (Pic) — Palier 12 [MOD.3]",
      duration: 40,
      exercises: [
        { id: "navettes-20m-s7", name: "Navettes 20m — Palier 12 (9,6 km/h)", weight: "BW", weightUnit: "", reps: "3", repsLabel: "MINUTES", sets: 5, group: 1, restSeconds: 180, muscles: ["Cardio","Jambes"], notes: "S7 semaine de pic: 5 × 3min (volume réduit). Recup 3min. Zone FC: Z4" },
      ],
    },
  ],
}

const s5_7_vendredi: WeekTemplate[0] = {
  day: 5,
  sessions: [
    {
      id: "s57-fri-gym",
      type: "workout",
      name: "Plyométrie & Unilatéral + Abdos",
      duration: 60,
      exercises: [
        { id: "nordic-curl-fri",   name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "6-8", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "S5:3×6 / S6:3×7 / S7:3×8. Priorité absolue" },
        { id: "sl-box-jumps",      name: "Single-Leg Box Jumps",     weight: "BW",    weightUnit: "", reps: "3-5",  repsLabel: "REPS CHAQUE", sets: 4, group: 1, restSeconds: 75, muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur modérée, réactif" },
        { id: "bulgarian-squats",  name: "Bulgarian Split Squats",   weight: "Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 90, muscles: ["Quads","Fessiers","Ischio-jambiers"] },
        { id: "wall-sit-weight",   name: "Weighted Wall Sit",        weight: "Lourd", weightUnit: "", reps: "30-60",repsLabel: "SECONDES", sets: 4, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Core"], notes: "Cherche une position stable. Charge modérée-lourde sur les cuisses." },
        { id: "pallof-press",      name: "Pallof Press",             weight: "Lourd", weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 2, restSeconds: 75, muscles: ["Core","Obliques"], notes: "Anti-rotation" },
        { id: "side-plank-oblique",name: "Side Plank + Crunch Oblique", weight: "BW", weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "roll-outs",         name: "Roll-Outs (Ab Wheel)",     weight: "BW",    weightUnit: "", reps: "10-15",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 60, muscles: ["Core","Épaules"] },
        { id: "mountain-climbers", name: "Mountain Climbers",        weight: "BW",    weightUnit: "", reps: "30-45",repsLabel: "SECONDES", sets: 3, group: 3, restSeconds: 60, muscles: ["Core","Fléchisseurs hanche"] },
        { id: "fond-de-jeu-run",   name: "Le Fond de Jeu (Z2)",      weight: "BW",    weightUnit: "", reps: "25-30",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Course stable, allure confortable" },
      ],
    },
  ],
}

const s8_lundi: WeekTemplate[0] = {
  day: 1,
  sessions: [
    {
      id: "s8-mon-gym",
      type: "workout",
      name: "Gym Allégé — Décharge [MOD.1]",
      duration: 40,
      exercises: [
        { id: "nordic-curl",  name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "Maintenu" },
        { id: "back-squat",   name: "Back Squat (60% 1RM)",    weight: "60%", weightUnit: "1RM", reps: "4", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 120, muscles: ["Quads","Fessiers"], notes: "Volume -40%. Supprimer Box Jumps et KB Swings" },
        { id: "z1-walk",      name: "Cardio Léger (Z1-Z2)",    weight: "BW", weightUnit: "",    reps: "20", repsLabel: "MINUTES", sets: 1, group: 2, restSeconds: 0, muscles: ["Cardio"] },
      ],
    },
  ],
}

const s8_mardi: WeekTemplate[0] = {
  day: 2,
  sessions: [
    {
      id: "s8-tue-cardio",
      type: "workout",
      name: "Cardio Réduit — Décharge [MOD.1]",
      duration: 30,
      exercises: [
        { id: "sprint-50m-reduit", name: "Sprint 50m — 3×4 séries", weight: "BW", weightUnit: "", reps: "4", repsLabel: "SPRINTS", sets: 3, group: 1, restSeconds: 300, muscles: ["Cardio","Jambes"], notes: "3 séries de 4 sprints 50m. Recup 30s entre sprints, 5min entre séries. Zone FC: Z4-Z5" },
      ],
    },
  ],
}

const s8_mercredi: WeekTemplate[0] = {
  day: 3,
  sessions: [
    {
      id: "s8-wed-gym",
      type: "workout",
      name: "Gym Réduit — Décharge [MOD.1]",
      duration: 35,
      exercises: [
        { id: "lateral-lunge",  name: "Lateral Lunge",        weight: "30", weightUnit: "POUNDS", reps: "6-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 45, muscles: ["Quads","Fessiers","Adducteurs"], notes: "Décharge: reste léger, tempo contrôlé." },
        { id: "lateral-bounds", name: "Lateral Bounds",        weight: "BW", weightUnit: "", reps: "6", repsLabel: "REPS", sets: 2, group: 2, restSeconds: 90, muscles: ["Fessiers","Adducteurs"] },
        { id: "broad-jumps",    name: "Broad Jumps",           weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 2, group: 2, restSeconds: 90, muscles: ["Quads","Fessiers"] },
        { id: "db-bench",       name: "Dumbbell Bench Press",  weight: "Modéré", weightUnit: "", reps: "8", repsLabel: "REPS", sets: 2, group: 2, restSeconds: 90, muscles: ["Pectoraux"] },
        { id: "lat-pulldown",   name: "Lat Pulldown",          weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Grand dorsal","Biceps"] },
        { id: "seated-cable-row", name: "Seated Cable Row",    weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Milieu du dos","Biceps"] },
        { id: "z1-cardio",      name: "Cardio Léger (Z1)",     weight: "BW", weightUnit: "", reps: "20", repsLabel: "MINUTES", sets: 1, group: 3, restSeconds: 0, muscles: ["Cardio"] },
      ],
    },
  ],
}

const s8_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s8-thu-cardio",
      type: "workout",
      name: "Navettes 20m Allégées — Décharge",
      duration: 35,
      exercises: [
        { id: "navettes-20m-s8", name: "Navettes 20m — Palier 11 (8,7 km/h)", weight: "BW", weightUnit: "", reps: "3", repsLabel: "MINUTES", sets: 4, group: 1, restSeconds: 180, muscles: ["Cardio","Jambes"], notes: "4 × 3min — Palier 11. Recup 3min. Zone FC: Z3" },
      ],
    },
  ],
}

const s8_vendredi: WeekTemplate[0] = {
  day: 5,
  sessions: [
    {
      id: "s8-fri-gym",
      type: "workout",
      name: "Mobilité & Unilatéral Allégé — Décharge [MOD.1]",
      duration: 35,
      exercises: [
        { id: "nordic-curl-fri", name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "5", repsLabel: "REPS", sets: 2, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"] },
        { id: "bulgarian-squats",name: "Bulgarian Split Squats (60%)", weight: "60%", weightUnit: "1RM", reps: "5", repsLabel: "REPS CHAQUE", sets: 2, group: 1, restSeconds: 90, muscles: ["Quads","Fessiers"], notes: "Pas de Sled Push" },
        { id: "z1z2-cardio",     name: "Cardio Récup (Z1-Z2)",         weight: "BW", weightUnit: "",    reps: "20", repsLabel: "MINUTES", sets: 1, group: 2, restSeconds: 0, muscles: ["Cardio"] },
      ],
    },
  ],
}

// ── PHASE 3 : S9-10 ────────────────────────────────────────────────────────────
const s9_10_lundi: WeekTemplate[0] = {
  day: 1,
  sessions: [
    {
      id: "s910-mon-gym",
      type: "workout",
      name: "Force Bas du Corps + Abdos",
      duration: 55,
      exercises: [
        { id: "nordic-curl",    name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "8", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "S9-S10: 3×8 rép. Priorité absolue avant Back Squat" },
        { id: "back-squat",     name: "Back Squat",           weight: "85-90%", weightUnit: "1RM", reps: "3-5",  repsLabel: "REPS", sets: 3, group: 1, restSeconds: 180, muscles: ["Quads","Fessiers","Ischio-jambiers"], notes: "Très lourd, focus puissance" },
        { id: "rdl",            name: "Romanian Deadlift",    weight: "Lourd",  weightUnit: "",    reps: "5-7",  repsLabel: "REPS", sets: 3, group: 1, restSeconds: 120, muscles: ["Ischio-jambiers","Fessiers","Bas du dos"], notes: "Contrôlé" },
        { id: "box-jumps",      name: "Box Jumps",            weight: "BW",     weightUnit: "",    reps: "3-5",  repsLabel: "REPS", sets: 4, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur maximale, réactivité" },
        { id: "kb-swings",      name: "Kettlebell Swings",    weight: "Très Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Ischio-jambiers","Fessiers","Core"], notes: "Puissance maximale" },
        { id: "plank-shoulder", name: "Planche + Toucher Épaule", weight: "BW", weightUnit: "",    reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Épaules"] },
        { id: "russian-heavy",  name: "Russian Twists (lourd)", weight: "Lourd", weightUnit: "",   reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "bicycle-crunch", name: "Bicycle Crunches",     weight: "BW",     weightUnit: "",    reps: "20-25",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Abdos"] },
        { id: "mise-en-jambes", name: "La Mise en Jambes (Z1-Z2)", weight: "BW", weightUnit: "",   reps: "15-20",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Trot très facile, juste réveiller les muscles" },
      ],
    },
  ],
}

const s11_12_lundi: WeekTemplate[0] = {
  day: 1,
  sessions: [
    {
      id: "s1112-mon-gym",
      type: "workout",
      name: "Force Bas du Corps + Abdos",
      duration: 50,
      exercises: [
        { id: "nordic-curl",    name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "6", repsLabel: "REPS", sets: 2, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "S11-S12: 2×6 rép (volume réduit pour fraîcheur avant test)" },
        { id: "back-squat",     name: "Back Squat",           weight: "85-90%", weightUnit: "1RM", reps: "3-5",  repsLabel: "REPS", sets: 3, group: 1, restSeconds: 180, muscles: ["Quads","Fessiers","Ischio-jambiers"], notes: "S11: réduit à 70% (MOD.4). Focus puissance" },
        { id: "rdl",            name: "Romanian Deadlift",    weight: "Lourd",  weightUnit: "",    reps: "5-7",  repsLabel: "REPS", sets: 3, group: 1, restSeconds: 120, muscles: ["Ischio-jambiers","Fessiers","Bas du dos"] },
        { id: "box-jumps",      name: "Box Jumps",            weight: "BW",     weightUnit: "",    reps: "3-5",  repsLabel: "REPS", sets: 4, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur maximale, réactivité" },
        { id: "kb-swings",      name: "Kettlebell Swings",    weight: "Très Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Ischio-jambiers","Fessiers","Core"] },
        { id: "plank-shoulder", name: "Planche + Toucher Épaule", weight: "BW", weightUnit: "",    reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Épaules"] },
        { id: "russian-heavy",  name: "Russian Twists (lourd)", weight: "Lourd", weightUnit: "",   reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "bicycle-crunch", name: "Bicycle Crunches",     weight: "BW",     weightUnit: "",    reps: "20-25",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Abdos"] },
        { id: "mise-en-jambes", name: "La Mise en Jambes (Z1-Z2)", weight: "BW", weightUnit: "",   reps: "15-20",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Trot très facile pour réveiller les muscles" },
      ],
    },
  ],
}

const s9_12_mardi: WeekTemplate[0] = {
  day: 2,
  sessions: [
    {
      id: "s912-tue-cardio",
      type: "workout",
      name: "Rappel du Moteur — Vitesse Maximale",
      duration: 35,
      exercises: [
        { id: "sprint-300m", name: "Sprint 300m Max (3 Longueurs) × 5", weight: "BW", weightUnit: "", reps: "5", repsLabel: "SPRINTS", sets: 5, group: 1, restSeconds: 120, muscles: ["Cardio","Jambes"], notes: "5 rép de 300m max. 2min marche lente entre chaque. Zone FC: Z5" },
      ],
    },
  ],
}

const s9_10_mercredi: WeekTemplate[0] = {
  day: 3,
  sessions: [
    {
      id: "s910-wed-gym",
      type: "workout",
      name: "Force Haut du Corps & COD Max + Abdos",
      duration: 55,
      exercises: [
        { id: "lateral-lunge",     name: "Lateral Lunge",                  weight: "30", weightUnit: "POUNDS", reps: "6-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 40, muscles: ["Quads","Fessiers","Adducteurs"], notes: "Qualité > charge. Si tu perds la stabilité, baisse le poids." },
        { id: "miroir-reactif",    name: "Miroir Réactif [MOD.5 Bloc B]",  weight: "BW", weightUnit: "", reps: "20",repsLabel: "SECONDES", sets: 3, group: 1, restSeconds: 40, muscles: ["Agilité"], notes: "Angles >90° intégrés. Phase 3: Blocs A+B" },
        { id: "lateral-bounds",    name: "Lateral Bounds",           weight: "BW",    weightUnit: "", reps: "4-6",  repsLabel: "REPS CHAQUE", sets: 4, group: 2, restSeconds: 90, muscles: ["Fessiers","Adducteurs","Quads"], notes: "Max distance et réactivité" },
        { id: "broad-jumps",       name: "Broad Jumps",              weight: "BW",    weightUnit: "", reps: "3-5",  repsLabel: "REPS", sets: 5, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Mollets"] },
        { id: "mb-slams",          name: "Medicine Ball Slams",      weight: "Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 75, muscles: ["Corps entier","Core","Épaules"], notes: "Puissance maximale" },
        { id: "db-bench",          name: "Dumbbell Bench Press",     weight: "Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 120, muscles: ["Pectoraux","Triceps","Épaules"] },
        { id: "lat-pulldown",      name: "Lat Pulldown",             weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Grand dorsal","Biceps"] },
        { id: "seated-cable-row",  name: "Seated Cable Row",         weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Milieu du dos","Biceps"] },
        { id: "side-plank-hip",    name: "Side Plank + Élévation Hanche", weight: "BW", weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "spider-plank",      name: "Spider Plank",             weight: "BW",    weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core","Fléchisseurs hanche"] },
        { id: "russian-med-heavy", name: "Russian Twists (MB lourd)", weight: "MB",   weightUnit: "", reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "souplesse-felin",   name: "La Souplesse du Félin (Z1)", weight: "BW",  weightUnit: "", reps: "15-20",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Mobilité"], notes: "Souplesse dynamique hanches et adducteurs" },
      ],
    },
  ],
}

const s11_12_mercredi: WeekTemplate[0] = {
  day: 3,
  sessions: [
    {
      id: "s1112-wed-gym",
      type: "workout",
      name: "Force Haut du Corps & COD + Abdos",
      duration: 50,
      exercises: [
        { id: "lateral-lunge",     name: "Lateral Lunge",                              weight: "30", weightUnit: "POUNDS", reps: "6-10", repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 40, muscles: ["Quads","Fessiers","Adducteurs"], notes: "Tapering: léger, focus amplitude + contrôle." },
        { id: "lateral-bounds",    name: "Lateral Bounds",           weight: "BW",    weightUnit: "", reps: "4-6",  repsLabel: "REPS CHAQUE", sets: 4, group: 2, restSeconds: 90, muscles: ["Fessiers","Adducteurs","Quads"] },
        { id: "broad-jumps",       name: "Broad Jumps",              weight: "BW",    weightUnit: "", reps: "3-5",  repsLabel: "REPS", sets: 5, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Mollets"] },
        { id: "mb-slams",          name: "Medicine Ball Slams",      weight: "Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 75, muscles: ["Corps entier","Core","Épaules"] },
        { id: "db-bench",          name: "Dumbbell Bench Press",     weight: "Lourd", weightUnit: "", reps: "6-8",  repsLabel: "REPS", sets: 3, group: 2, restSeconds: 120, muscles: ["Pectoraux","Triceps","Épaules"] },
        { id: "lat-pulldown",      name: "Lat Pulldown",             weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Grand dorsal","Biceps"] },
        { id: "seated-cable-row",  name: "Seated Cable Row",         weight: "Modéré", weightUnit: "", reps: "8-12", repsLabel: "REPS", sets: 3, group: 2, restSeconds: 90, muscles: ["Dos","Milieu du dos","Biceps"] },
        { id: "side-plank-hip",    name: "Side Plank + Élévation Hanche", weight: "BW", weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "spider-plank",      name: "Spider Plank",             weight: "BW",    weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "russian-med-heavy", name: "Russian Twists (MB lourd)", weight: "MB",   weightUnit: "", reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Obliques","Core"] },
        { id: "souplesse-felin",   name: "La Souplesse du Félin (Z1)", weight: "BW",  weightUnit: "", reps: "15-20",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Mobilité"], notes: "Souplesse dynamique hanches et adducteurs" },
      ],
    },
  ],
}

const s9_11_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s911-thu-cardio",
      type: "workout",
      name: "Beep Test Builder Phase 3 — Paliers 13-14 [MOD.3]",
      duration: 50,
      exercises: [
        { id: "navettes-20m-p3", name: "Navettes 20m — Paliers 13-14 (10,4-11,1 km/h)", weight: "BW", weightUnit: "", reps: "4", repsLabel: "MINUTES", sets: 5, group: 1, restSeconds: 120, muscles: ["Cardio","Jambes"], notes: "5 × 4min. Recup 2min entre sets. Série 5 TOUJOURS à palier 14 (ton stimulus de pic). Zone FC: Z4-Z5" },
      ],
    },
  ],
}

const s12_jeudi: WeekTemplate[0] = {
  day: 4,
  sessions: [
    {
      id: "s12-thu-cardio",
      type: "workout",
      name: "Fartlek Football — Dernier Stimulus [MOD.3]",
      duration: 35,
      exercises: [
        { id: "fartlek-s12", name: "Fartlek Spécifique Football (15 min)", weight: "BW", weightUnit: "", reps: "15", repsLabel: "MINUTES", sets: 1, group: 1, restSeconds: 0, muscles: ["Cardio","Jambes"], notes: "Sprint 16m (95%) → Trot 65m → Course rapide 100m (80%) → Marche 65m. Dernier stimulus J-7 avant test. Zone FC: Z4-Z5" },
      ],
    },
  ],
}

const s9_10_vendredi: WeekTemplate[0] = {
  day: 5,
  sessions: [
    {
      id: "s910-fri-gym",
      type: "workout",
      name: "Plyométrie & Unilatéral + Abdos",
      duration: 55,
      exercises: [
        { id: "nordic-curl-fri",  name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "8", repsLabel: "REPS", sets: 3, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "S9-S10: 3×8 rép" },
        { id: "sl-box-jumps",     name: "Single-Leg Box Jumps",      weight: "BW",         weightUnit: "", reps: "2-4",  repsLabel: "REPS CHAQUE", sets: 4, group: 1, restSeconds: 90, muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur maximale, réactivité max" },
        { id: "bulgarian-squats", name: "Bulgarian Split Squats",    weight: "Très Lourd", weightUnit: "", reps: "5-7",  repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 120, muscles: ["Quads","Fessiers","Ischio-jambiers"] },
        { id: "wall-sit-weight",  name: "Weighted Wall Sit",         weight: "Léger",      weightUnit: "", reps: "30-60",repsLabel: "SECONDES", sets: 4, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Core"], notes: "Charge légère, focus qualité de position. Respiration contrôlée." },
        { id: "pallof-press",     name: "Pallof Press",              weight: "Très Lourd", weightUnit: "", reps: "8-10", repsLabel: "REPS CHAQUE", sets: 3, group: 2, restSeconds: 90, muscles: ["Core","Obliques"] },
        { id: "commando-plank",   name: "Commando Plank",            weight: "BW",         weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Épaules"] },
        { id: "mb-crunches",      name: "Crunchs Med Ball (explosif)", weight: "MB",        weightUnit: "", reps: "15-20",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 45, muscles: ["Abdos","Core"] },
        { id: "plank-hip-dips",   name: "Planche + Hip Dips",        weight: "BW",         weightUnit: "", reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Obliques"] },
        { id: "allumage-run",     name: "L'Allumage (Z2)",           weight: "BW",         weightUnit: "", reps: "15-20",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Course facile + 4 accélérations progressives sur 50m" },
      ],
    },
  ],
}

/**
 * Injecte le contenu canonique du plan cardio (plan_elite_lateral_v2) dans les templates.
 * — Mardi / Jeudi : remplace la séance cardio complète.
 * — Autres jours : remplace le dernier exercice « Cardio » du premier bloc séance.
 */
function injectCardioFromPlan(week: number, tpl: WeekTemplate[0]): WeekTemplate[0] {
  const key = dayNumberToCardioKey(tpl.day)
  if (!key) return tpl
  const spec = getCardioSession(week, key)
  if (!spec) return tpl

  const pureCardioDay = tpl.day === 2 || tpl.day === 4

  return {
    ...tpl,
    sessions: tpl.sessions.map((s, sessionIdx) => {
      if (sessionIdx !== 0) return s
      if (pureCardioDay) {
        const title = spec.phaseLabel ? `${spec.name} — ${spec.phaseLabel}` : spec.name
        return {
          ...s,
          name: title,
          duration: spec.durationMinutes,
          exercises: spec.exercises.map((e, i) => ({
            ...e,
            id: `${s.id}-cardio-${i}`,
          })),
        }
      }
      const ex = [...s.exercises]
      const cardioIdx = ex.findLastIndex((e) => e.muscles?.includes("Cardio"))
      if (cardioIdx < 0 || !spec.exercises[0]) return s
      const patch = spec.exercises[0]
      ex[cardioIdx] = {
        ...ex[cardioIdx],
        name: patch.name,
        reps: patch.reps,
        repsLabel: patch.repsLabel,
        sets: patch.sets,
        group: patch.group,
        restSeconds: patch.restSeconds,
        muscles: patch.muscles,
        notes: patch.notes,
      }
      return { ...s, exercises: ex }
    }),
  }
}

const s11_12_vendredi: WeekTemplate[0] = {
  day: 5,
  sessions: [
    {
      id: "s1112-fri-gym",
      type: "workout",
      name: "Plyométrie & Unilatéral + Abdos",
      duration: 50,
      exercises: [
        { id: "nordic-curl-fri",  name: "Nordic Hamstring Curl [MOD.2]", weight: "BW", weightUnit: "", reps: "6", repsLabel: "REPS", sets: 2, group: 1, restSeconds: 90, muscles: ["Ischio-jambiers"], notes: "S11-S12: 2×6 rép (volume réduit pour fraîcheur avant test)" },
        { id: "sl-box-jumps",     name: "Single-Leg Box Jumps",      weight: "BW",         weightUnit: "", reps: "2-4",  repsLabel: "REPS CHAQUE", sets: 4, group: 1, restSeconds: 90, muscles: ["Quads","Fessiers","Mollets"], notes: "Hauteur maximale, réactivité max" },
        { id: "bulgarian-squats", name: "Bulgarian Split Squats",    weight: "Très Lourd", weightUnit: "", reps: "5-7",  repsLabel: "REPS CHAQUE", sets: 3, group: 1, restSeconds: 120, muscles: ["Quads","Fessiers","Ischio-jambiers"] },
        { id: "wall-sit-weight",  name: "Weighted Wall Sit",         weight: "Léger",      weightUnit: "", reps: "30-60",repsLabel: "SECONDES", sets: 4, group: 2, restSeconds: 120, muscles: ["Quads","Fessiers","Core"], notes: "Charge légère, focus qualité de position. Respiration contrôlée." },
        { id: "pallof-press",     name: "Pallof Press",              weight: "Très Lourd", weightUnit: "", reps: "8-10", repsLabel: "REPS CHAQUE", sets: 3, group: 2, restSeconds: 90, muscles: ["Core","Obliques"] },
        { id: "commando-plank",   name: "Commando Plank",            weight: "BW",         weightUnit: "", reps: "10-12",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Épaules"] },
        { id: "mb-crunches",      name: "Crunchs Med Ball (explosif)", weight: "MB",        weightUnit: "", reps: "15-20",repsLabel: "REPS", sets: 3, group: 3, restSeconds: 45, muscles: ["Abdos","Core"] },
        { id: "plank-hip-dips",   name: "Planche + Hip Dips",        weight: "BW",         weightUnit: "", reps: "15-20",repsLabel: "REPS CHAQUE", sets: 3, group: 3, restSeconds: 45, muscles: ["Core","Obliques"] },
        { id: "allumage-run",     name: "L'Allumage (Z2)",           weight: "BW",         weightUnit: "", reps: "15-20",repsLabel: "MINUTES", sets: 1, group: 4, restSeconds: 0, muscles: ["Cardio"], notes: "Course facile + 4 accélérations sur 50m" },
      ],
    },
  ],
}

function buildDays(week: number): WorkoutDay[] {
  let lundi: WeekTemplate[0]
  let mardi: WeekTemplate[0]
  let mercredi: WeekTemplate[0]
  let jeudi: WeekTemplate[0]
  let vendredi: WeekTemplate[0]

  if (week === 4) {
    lundi = s4_lundi; mardi = s4_mardi; mercredi = s4_mercredi; jeudi = s4_jeudi; vendredi = s4_vendredi
  } else if (week === 8) {
    lundi = s8_lundi; mardi = s8_mardi; mercredi = s8_mercredi; jeudi = s8_jeudi; vendredi = s8_vendredi
  } else if (week <= 3) {
    lundi = s1_3_lundi; mardi = s1_3_mardi; mercredi = s1_3_mercredi; jeudi = s1_3_jeudi; vendredi = s1_3_vendredi
  } else if (week === 7) {
    lundi = s5_7_lundi; mardi = s5_7_mardi; mercredi = s5_7_mercredi; jeudi = s7_jeudi; vendredi = s5_7_vendredi
  } else if (week <= 6) {
    lundi = s5_7_lundi; mardi = s5_7_mardi; mercredi = s5_7_mercredi; jeudi = s5_6_jeudi; vendredi = s5_7_vendredi
  } else if (week <= 10) {
    lundi = s9_10_lundi; mardi = s9_12_mardi; mercredi = s9_10_mercredi; jeudi = s9_11_jeudi; vendredi = s9_10_vendredi
  } else if (week === 11) {
    lundi = s11_12_lundi; mardi = s9_12_mardi; mercredi = s11_12_mercredi; jeudi = s9_11_jeudi; vendredi = s11_12_vendredi
  } else {
    lundi = s11_12_lundi; mardi = s9_12_mardi; mercredi = s11_12_mercredi; jeudi = s12_jeudi; vendredi = s11_12_vendredi
  }

  const dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]
  const dayTemplates = [lundi, mardi, mercredi, jeudi, vendredi].map((tpl) =>
    injectCardioFromPlan(week, tpl),
  )

  return dayTemplates.map((tpl) => ({
    day: tpl.day,
    sessions: tpl.sessions.map((s) => ({
      ...s,
      id: `${s.id}-w${week}`,
      name: `${dayNames[tpl.day - 1]} — ${s.name}`,
      exercises: s.exercises.map((e) => ({
        ...e,
        id: `${e.id}-w${week}`,
        demoVideoUrl: getDemoVideoUrl(e.id),
      })),
    })),
  }))
}

function phaseLabel(week: number): string {
  if (week === 4) return "Phase 1 — Semaine de Décharge [MOD.1]"
  if (week === 8) return "Phase 2 — Semaine de Décharge [MOD.1]"
  if (week <= 3) return "Phase 1 : Construire le Moteur"
  if (week <= 7) return "Phase 2 : Devenir un Chasseur"
  if (week <= 11) return "Phase 3 : Mode Compétition"
  return "Phase 3 : Semaine d'Affûtage (Tapering)"
}

export function getWeekProgram(weekNumber: number): Program {
  const w = Math.min(Math.max(weekNumber, 1), TOTAL_WEEKS)
  return {
    id: `football-program-w${w}`,
    ownerName: "Javier",
    name: "PRO GYM — LATÉRAL/PISTON V2",
    week: `Semaine ${w} / ${TOTAL_WEEKS} — ${phaseLabel(w)}`,
    totalWeeks: TOTAL_WEEKS,
    days: buildDays(w),
  }
}
