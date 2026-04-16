import { ChevronLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

const DUO_FOOT_EXERCISES = [
  { id: 1, name: "Two-Player Passing Combo", link: "https://www.instagram.com/p/DVaVzroEsAO/" },
  { id: 2, name: "1v1 Dribble Challenge", link: "https://www.instagram.com/p/DVigF2Ykk-d/" },
  { id: 3, name: "Duo Finishing Drill", link: "https://www.instagram.com/p/DVkgZTTEhla/" },
  { id: 4, name: "Wall Pass & Move", link: "https://www.instagram.com/p/DWDLGYCgQQX/" },
  { id: 5, name: "Quick Combination Play", link: "https://www.instagram.com/p/DLQO251NR3y/" },
  { id: 6, name: "Rondo 2v1", link: "https://www.instagram.com/p/DVaVzroEsAO/" },
  { id: 7, name: "Overlapping Run", link: "https://www.instagram.com/p/DVigF2Ykk-d/" },
  { id: 8, name: "Through Ball Timing", link: "https://www.instagram.com/p/DVkgZTTEhla/" },
  { id: 9, name: "Defensive Pressure Drill", link: "https://www.instagram.com/p/DWDLGYCgQQX/" },
  { id: 10, name: "One-Two Pass Sequence", link: "https://www.instagram.com/p/DLQO251NR3y/" },
  { id: 11, name: "Transition Attack", link: "https://www.instagram.com/p/DVaVzroEsAO/" },
  { id: 12, name: "Crossing & Heading", link: "https://www.instagram.com/p/DVigF2Ykk-d/" },
  { id: 13, name: "Pressing Drill", link: "https://www.instagram.com/p/DVkgZTTEhla/" },
  { id: 14, name: "Duo Agility Ladder", link: "https://www.instagram.com/p/DWDLGYCgQQX/" },
  { id: 15, name: "Combination Finish", link: "https://www.instagram.com/p/DLQO251NR3y/" },
]

export default function DuoFootTraining({ onBack }: { onBack: () => void }) {

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="bg-zinc-800 border-b border-zinc-700 sticky top-0 z-10">
        <div className="flex items-center gap-4 px-4 py-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="p-1 hover:bg-zinc-700 rounded transition-colors text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Duo Foot Training</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        <p className="text-zinc-400 text-sm mb-6">
          Click on any exercise to watch the tutorial video and learn the technique.
        </p>

        {DUO_FOOT_EXERCISES.map((exercise) => (
          <a
            key={exercise.id}
            href={exercise.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                {exercise.id}
              </div>
              <span className="font-medium group-hover:text-red-400 transition-colors">
                {exercise.name}
              </span>
            </div>
            <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-red-400 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  )
}
