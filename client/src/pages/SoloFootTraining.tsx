import { useEffect, useMemo, useState } from "react"
import { CircleDot, Goal, Zap, Hand } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  MediaCategoryBrowser,
  type MediaBrowserState,
  type MediaCategory,
} from "@/components/app/MediaCategoryBrowser"
import {
  fetchSoloVideoManifest,
  groupSoloVideosByCategory,
  type SoloVideoCategory,
  type SoloVideoItem,
} from "@/lib/soloVideoLibrary"

const CATEGORY_META: Record<
  SoloVideoCategory,
  { name: string; description: string; icon: LucideIcon; gradient: string }
> = {
  ball_mastery: {
    name: "Ball Mastery",
    description: "Touches, dribbling, coordination",
    icon: CircleDot,
    gradient: "from-sky-500 to-cyan-500",
  },
  finishing: {
    name: "Finishing",
    description: "Shots, placement, efficiency",
    icon: Goal,
    gradient: "from-rose-500 to-orange-500",
  },
  agility: {
    name: "Agility",
    description: "Quick feet, change of direction",
    icon: Zap,
    gradient: "from-emerald-500 to-lime-500",
  },
  first_touch: {
    name: "First Touch",
    description: "Control, body position, first contact",
    icon: Hand,
    gradient: "from-violet-500 to-fuchsia-500",
  },
}

const CATEGORY_ORDER: SoloVideoCategory[] = [
  "ball_mastery",
  "first_touch",
  "agility",
  "finishing",
]

export default function SoloFootTraining({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<SoloVideoItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    setItems(null)
    fetchSoloVideoManifest()
      .then((v) => setItems(v))
      .catch((e: unknown) => {
        if (
          e &&
          typeof e === "object" &&
          "name" in e &&
          (e as { name?: string }).name === "AbortError"
        )
          return
        setError(e instanceof Error ? e.message : String(e))
      })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories: MediaCategory[] = useMemo(() => {
    const grouped = groupSoloVideosByCategory(items ?? [])
    return CATEGORY_ORDER.map((catId) => {
      const meta = CATEGORY_META[catId]
      const list = grouped[catId] ?? []
      return {
        id: catId,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        gradient: meta.gradient,
        items: list.map((v, idx) => ({
          id: `${catId}:${idx}:${v.url}`,
          name: v.title,
          src: v.url,
          kind: "video" as const,
        })),
      }
    })
  }, [items])

  const state: MediaBrowserState = error
    ? {
        kind: "error",
        message: `${error}. Make sure \`client/public/solo-videos/manifest.json\` exists.`,
        onRetry: load,
      }
    : items == null
      ? { kind: "loading" }
      : { kind: "ready", categories }

  return (
    <MediaCategoryBrowser
      title="Solo Foot"
      eyebrow="Train Alone"
      state={state}
      onBack={onBack}
    />
  )
}
