import { ArrowRight, User, Users, Trophy } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface LibraryProps {
  onNavigateToTraining: (type: "solo" | "duo" | "club") => void
}

interface LibCard {
  id: "solo" | "duo" | "club"
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
}

const CARDS: LibCard[] = [
  {
    id: "solo",
    title: "Solo Foot",
    subtitle: "TRAIN ALONE",
    description: "Ball mastery, agility, first touch & finishing.",
    icon: User,
  },
  {
    id: "duo",
    title: "Duo Foot",
    subtitle: "WITH A PARTNER",
    description: "Passing, combos, 1v1, finishing duets.",
    icon: Users,
  },
  {
    id: "club",
    title: "Club Training",
    subtitle: "FULL TEAM",
    description: "Warm-ups, possession, transitions, finishing.",
    icon: Trophy,
  },
]

export default function Library({ onNavigateToTraining }: LibraryProps) {
  return (
    <div className="nk-page">
      <header className="nk-topbar">
        <div className="flex flex-col">
          <span className="nk-eyebrow text-white/40">Library</span>
          <span className="text-base font-extrabold tracking-tight">
            ALL DRILLS
          </span>
        </div>
      </header>

      <section className="px-6 pt-4">
        <h1 className="nk-h-massive">
          TRAIN.
          <br />
          ANY MODE.
        </h1>
      </section>

      <section className="nk-stack-lg pt-32">
        <h2 className="nk-h-section">Pick a Mode</h2>
        <div className="flex flex-col gap-3">
          {CARDS.map((card) => {
            const Icon = card.icon
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigateToTraining(card.id)}
                className="nk-tile gap-4 p-5"
              >
                <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="nk-eyebrow text-white/40">
                    {card.subtitle}
                  </span>
                  <p className="text-2xl font-black tracking-tight leading-none mt-1.5 mb-1.5">
                    {card.title.toUpperCase()}
                  </p>
                  <p className="text-xs text-white/55 line-clamp-1">
                    {card.description}
                  </p>
                </div>
                <ArrowRight className="size-5 text-white/40 shrink-0" />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
