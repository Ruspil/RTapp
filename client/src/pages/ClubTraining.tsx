import {
  Flame,
  Repeat,
  CircleDot,
  ArrowRightLeft,
  Goal,
} from "lucide-react"
import {
  MediaCategoryBrowser,
  type MediaCategory,
} from "@/components/app/MediaCategoryBrowser"

const CATEGORIES: MediaCategory[] = [
  {
    id: "warm_up",
    name: "Warm Up",
    description: "Activation and dynamic passing",
    icon: Flame,
    gradient: "from-orange-500 to-yellow-500",
    items: [
      {
        id: "warm-up-passes-mouvement",
        name: "Warm-Up — Passing on the Move",
        src: "/club_training/warm_up/echauffement-passes-mouvement.mp4",
        kind: "video",
      },
      {
        id: "warm-up-schema",
        name: "Warm-Up Diagram",
        src: "/club_training/warm_up/echauffement-schema.png",
        kind: "image",
      },
    ],
  },
  {
    id: "passing_pattern",
    name: "Passing Pattern",
    description: "Passing patterns and technical combinations",
    icon: Repeat,
    gradient: "from-sky-500 to-cyan-500",
    items: [
      {
        id: "warm-up-passing-drill",
        name: "Warm-Up Passing Drill",
        src: "/club_training/passing_pattern/warm-up-passing-drill.mp4",
        kind: "video",
      },
      {
        id: "passes-deux-groupes-9",
        name: "Passing — Two Groups of 9",
        src: "/club_training/passing_pattern/passes-deux-groupes-9.mp4",
        kind: "video",
      },
    ],
  },
  {
    id: "possession",
    name: "Possession",
    description: "Possession games, rondos and positional play",
    icon: CircleDot,
    gradient: "from-emerald-500 to-green-500",
    items: [
      {
        id: "jeu-possession-5v5",
        name: "Possession Game 5v5",
        src: "/club_training/possession/jeu-possession-5v5.mp4",
        kind: "video",
      },
      {
        id: "split-the-line",
        name: "Split The Line — Positional Game",
        src: "/club_training/possession/split-the-line.mp4",
        kind: "video",
      },
      {
        id: "rondo-10v3",
        name: "Rondo 10v3 — High Intensity",
        src: "/club_training/possession/rondo-10v3-haute-intensite.mp4",
        kind: "video",
      },
    ],
  },
  {
    id: "transition",
    name: "Transition",
    description: "Offensive and defensive transitions",
    icon: ArrowRightLeft,
    gradient: "from-violet-500 to-purple-500",
    items: [
      {
        id: "transition-1v1-3v3",
        name: "Progressive Transition — 1v1 → 3v3",
        src: "/club_training/transition/transition-progressive-1v1-3v3.mp4",
        kind: "video",
      },
      {
        id: "jeu-transition",
        name: "Transition Game",
        src: "/club_training/transition/jeu-transition.mp4",
        kind: "video",
      },
    ],
  },
  {
    id: "finishing",
    name: "Finishing",
    description: "Finishing drills in front of goal",
    icon: Goal,
    gradient: "from-rose-500 to-red-500",
    items: [
      {
        id: "exercice-finition",
        name: "Finishing Drill",
        src: "/club_training/finishing/exercice-finition.mp4",
        kind: "video",
      },
    ],
  },
]

export default function ClubTraining({ onBack }: { onBack: () => void }) {
  return (
    <MediaCategoryBrowser
      title="Club Training"
      eyebrow="Full Team"
      state={{ kind: "ready", categories: CATEGORIES }}
      onBack={onBack}
    />
  )
}
