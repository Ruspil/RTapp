export type DuoVideoCategory =
  | "dribbling"
  | "circuit_conduite"
  | "finishing"
  | "first_touch"
  | "passing"

export interface DuoVideoItem {
  category: DuoVideoCategory
  title: string
  url: string
}

export const DUO_VIDEO_MANIFEST_URL = "/duo-videos/manifest.json"

const VALID: DuoVideoCategory[] = [
  "dribbling",
  "circuit_conduite",
  "finishing",
  "first_touch",
  "passing",
]

export async function fetchDuoVideoManifest(signal?: AbortSignal): Promise<DuoVideoItem[]> {
  const res = await fetch(DUO_VIDEO_MANIFEST_URL, { signal })
  if (!res.ok) throw new Error(`Failed to load duo video manifest (${res.status})`)
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []

  const out: DuoVideoItem[] = []
  for (const it of data) {
    if (!it || typeof it !== "object") continue
    const category = (it as any).category
    const title = (it as any).title
    const url = (it as any).url
    if (typeof category !== "string" || typeof title !== "string" || typeof url !== "string") continue
    if (!VALID.includes(category as DuoVideoCategory)) continue
    out.push({ category: category as DuoVideoCategory, title, url })
  }

  return out.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }))
}

export function groupDuoVideosByCategory(items: DuoVideoItem[]): Record<DuoVideoCategory, DuoVideoItem[]> {
  return items.reduce(
    (acc, v) => {
      acc[v.category].push(v)
      return acc
    },
    {
      dribbling: [],
      circuit_conduite: [],
      finishing: [],
      first_touch: [],
      passing: [],
    } as Record<DuoVideoCategory, DuoVideoItem[]>,
  )
}
