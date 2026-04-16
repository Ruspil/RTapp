import { useState } from "react"
import { Play, VideoOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExerciseDemoVideoProps {
  videoUrl: string
  title: string
  className?: string
  /** Shorter max height on small screens */
  compact?: boolean
}

/**
 * Human demo loop — GIF / animated WebP from public/ or remote HTTPS.
 */
export function ExerciseDemoVideo({ videoUrl, title, className, compact }: ExerciseDemoVideoProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl bg-muted/50 text-muted-foreground text-xs p-6",
          className,
        )}
      >
        <VideoOff className="size-8 opacity-50" />
        <p className="text-center">Could not load demo video. Check the URL or file in public/exercise-demos/</p>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl bg-black", className)}>
      <img
        src={videoUrl}
        alt={`${title} demo`}
        className={cn(
          "w-full object-contain pointer-events-none select-none",
          compact ? "max-h-48" : "max-h-64 sm:max-h-80"
        )}
        loading="lazy"
        onError={() => setError(true)}
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white pointer-events-none">
        <Play className="size-3 fill-white" />
        Demo
      </div>
    </div>
  )
}
