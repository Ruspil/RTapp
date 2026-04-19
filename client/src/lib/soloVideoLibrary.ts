export type SoloVideoCategory = "ball_mastery" | "finishing" | "agility" | "first_touch"

export interface SoloVideoItem {
  category: SoloVideoCategory
  title: string
  url: string
}

export const SOLO_VIDEO_MANIFEST_URL = "/solo-videos/manifest.json"

export async function fetchSoloVideoManifest(signal?: AbortSignal): Promise<SoloVideoItem[]> {
  const res = await fetch(SOLO_VIDEO_MANIFEST_URL, { signal })
  if (!res.ok) throw new Error(`Failed to load solo video manifest (${res.status})`)
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []

  // lightweight runtime validation
  const out: SoloVideoItem[] = []
  for (const it of data) {
    if (!it || typeof it !== "object") continue
    const category = (it as any).category
    const title = (it as any).title
    const url = (it as any).url
    if (typeof category !== "string" || typeof title !== "string" || typeof url !== "string") continue
    if (!["ball_mastery", "finishing", "agility", "first_touch"].includes(category)) continue
    out.push({ category: category as SoloVideoCategory, title, url })
  }

  return out.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }))
}

export function groupSoloVideosByCategory(items: SoloVideoItem[]): Record<SoloVideoCategory, SoloVideoItem[]> {
  return items.reduce(
    (acc, v) => {
      acc[v.category].push(v)
      return acc
    },
    {
      ball_mastery: [],
      finishing: [],
      agility: [],
      first_touch: [],
    } as Record<SoloVideoCategory, SoloVideoItem[]>,
  )
}

