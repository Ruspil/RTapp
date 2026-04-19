import { useEffect, useMemo, useState } from "react"
import { Repeat, Goal, Hand, Move, Sparkles } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  MediaCategoryBrowser,
  type MediaBrowserState,
  type MediaCategory,
} from "@/components/app/MediaCategoryBrowser"
import {
  fetchDuoVideoManifest,
  groupDuoVideosByCategory,
  type DuoVideoCategory,
  type DuoVideoItem,
} from "@/lib/duoVideoLibrary"

const CATEGORY_META: Record<
  DuoVideoCategory,
  { name: string; description: string; icon: LucideIcon; gradient: string }
> = {
  dribbling: {
    name: "Dribbling",
    description: "1v1, partner work, speed",
    icon: Sparkles,
    gradient: "from-red-500 to-pink-500",
  },
  circuit_conduite: {
    name: "Conduction Circuits",
    description: "Technique, footwork, fatigue",
    icon: Move,
    gradient: "from-orange-500 to-amber-500",
  },
  finishing: {
    name: "Finishing",
    description: "Shots, volleys, efficiency",
    icon: Goal,
    gradient: "from-rose-500 to-red-600",
  },
  first_touch: {
    name: "First Touch",
    description: "Control, 1–2 touch passing",
    icon: Hand,
    gradient: "from-violet-500 to-fuchsia-500",
  },
  passing: {
    name: "Passing",
    description: "Duo, one-touch, combinations",
    icon: Repeat,
    gradient: "from-amber-500 to-yellow-500",
  },
}

const CATEGORY_ORDER: DuoVideoCategory[] = [
  "passing",
  "first_touch",
  "circuit_conduite",
  "dribbling",
  "finishing",
]

export default function DuoFootTraining({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<DuoVideoItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    setItems(null)
    fetchDuoVideoManifest()
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
    const grouped = groupDuoVideosByCategory(items ?? [])
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
        message: `${error}. Make sure \`client/public/duo-videos/manifest.json\` exists.`,
        onRetry: load,
      }
    : items == null
      ? { kind: "loading" }
      : { kind: "ready", categories }

  return (
    <MediaCategoryBrowser
      title="Duo Foot"
      eyebrow="With a Partner"
      state={state}
      onBack={onBack}
    />
  )
}
