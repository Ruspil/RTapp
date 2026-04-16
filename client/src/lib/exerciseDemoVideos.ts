/**
 * Auto-map exercise template ids (before `-w{week}`) → demo URL.
 *
 * Demo files live in `client/public/exercise-demos/` and should be GIF / animated WebP.
 * Filenames are normalized (case/spacing) to match the ids from `workoutData.ts`.
 */

const DEMO_FILES: string[] = [
  "BallSlam.gif",
  "Bird_dog.gif",
  "box_jump.gif",
  "Broad_jump.gif",
  "Bulgarian Split Squats.webp",
  "Dumbbell-Chest-Press.webp",
  "Kettlebellswing.webp",
  "Lateral_lungegif.gif",
  "Lateral Bounds.gif",
  "lat-pulldown.webp",
  "Leg_Raise.gif",
  "Nordic Hamstring Curl.gif",
  "pallof-press.webp",
  "planche.gif",
  "reverse-crunch.gif",
  "Romanian-deadlift.webp",
  "Russian_twist.gif",
  "Seated-Cable-Row.gif",
  "Side_Plank.gif",
  "Sidevplank.gif",
  "Single-Leg Box Jumps.gif",
  "squat.webp",
  "wall-sit-weight.gif",
  "woodchop.webp",
]

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\.(gif|webp|png|jpg|jpeg)$/i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
}

const ALIASES: Record<string, string> = {
  // French name in file → template id in program
  planche: "front-plank",
  sidevplank: "side-plank",
  "side-plank": "side-plank",
  "bird-dog": "bird-dog",
  "bird-dog_": "bird-dog",
  ballslam: "mb-slams",
  "ball-slam": "mb-slams",
  "dumbbell-chest-press": "db-bench",
  squat: "back-squat",
  "box-jump": "box-jumps",
  "broad-jump": "broad-jumps",
  "lateral-bounds": "lateral-bounds",
  "russian-twist": "russian-twists",
  "leg-raise": "leg-raises",
  "seated-cable-row": "seated-cable-row",
  "lat-pulldown": "lat-pulldown",
  // Common English filenames
  "nordic-hamstring-curl": "nordic-curl",
  "romanian-deadlift": "rdl",
  kettlebellswing: "kb-swings",
  "bulgarian-split-squats": "bulgarian-squats",
  "single-leg-box-jumps": "sl-box-jumps",
  woodchop: "wood-chops",
  "reverse-crunch": "reverse-crunches",
  // User-provided file name example
  "lateral-lungegif": "lateral-lunge",
}

const urlByTemplateId: Record<string, string> = DEMO_FILES.reduce((acc, filename) => {
  const raw = normalizeKey(filename)
  const k = ALIASES[raw] ?? raw
  acc[k] = `/exercise-demos/${encodeURIComponent(filename)}`
  return acc
}, {} as Record<string, string>)

/** Collapse template id variants to a base exercise id. */
const TEMPLATE_ID_ALIASES: Record<string, string> = {
  // Nordic appears as `nordic-curl` and `nordic-curl-fri`
  "nordic-curl-fri": "nordic-curl",
  // Map program ids to closest available demo where no exact match exists
  "plank-hip-dips": "front-plank",
  "side-plank-rotation": "side-plank",
}

export function getDemoVideoUrl(templateExerciseId: string): string | undefined {
  const raw = normalizeKey(templateExerciseId)
  const k = TEMPLATE_ID_ALIASES[raw] ?? raw
  return urlByTemplateId[k] ?? undefined
}
