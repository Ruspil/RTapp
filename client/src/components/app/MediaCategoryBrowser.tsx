import { useEffect, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  Image as ImageIcon,
  Play,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type MediaKind = "video" | "image"

export type MediaItem = {
  id: number | string
  name: string
  src: string
  kind: MediaKind
}

export type MediaCategory = {
  id: string
  name: string
  description: string
  icon: LucideIcon
  /** Tailwind gradient classes, e.g. "from-orange-500 to-yellow-500" */
  gradient: string
  items: MediaItem[]
}

export type MediaBrowserState =
  | { kind: "loading" }
  | { kind: "error"; message: string; onRetry?: () => void }
  | { kind: "ready"; categories: MediaCategory[] }

export interface MediaCategoryBrowserProps {
  /** Big title shown on the categories screen, e.g. "SOLO FOOT". */
  title: string
  /** Eyebrow above the title (small caps), e.g. "TRAIN ALONE". Optional. */
  eyebrow?: string
  /** Optional intro line — kept for backward compatibility, not displayed in Nike layout. */
  intro?: string
  state: MediaBrowserState
  onBack: () => void
}

export function MediaCategoryBrowser({
  title,
  eyebrow,
  state,
  onBack,
}: MediaCategoryBrowserProps) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null)

  const categories = state.kind === "ready" ? state.categories : []
  const openCategory = openCategoryId
    ? categories.find((c) => c.id === openCategoryId) ?? null
    : null

  const handleBack = () => {
    if (openCategory) {
      setOpenCategoryId(null)
    } else {
      onBack()
    }
  }

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0)

  return (
    <div className="nk-page">
      {/* Top bar */}
      <header className="nk-topbar">
        <button
          type="button"
          onClick={handleBack}
          className="nk-icon-btn"
          aria-label="Back"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="nk-eyebrow text-white/40">
          {openCategory ? title.toUpperCase() : "Library"}
        </span>
        <span className="size-9" aria-hidden />
      </header>

      {/* Page hero */}
      {!openCategory ? (
        <section className="px-6 pt-2">
          {eyebrow && (
            <span className="nk-eyebrow text-white/40 block mb-2">
              {eyebrow}
            </span>
          )}
          <h1 className="nk-h-massive">{title.toUpperCase()}</h1>
          {state.kind === "ready" && (
            <p className="nk-eyebrow text-white/35 mt-3">
              {categories.length} categories · {totalItems} drills
            </p>
          )}
        </section>
      ) : (
        <section className="px-6 pt-2">
          <span className="nk-eyebrow text-white/40 block mb-2">Category</span>
          <h1 className="nk-h-display">{openCategory.name.toUpperCase()}</h1>
          <p className="text-sm text-white/55 mt-2 max-w-md">
            {openCategory.description}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <span className="nk-chip">
              {openCategory.items.length}{" "}
              {openCategory.items.length === 1 ? "Drill" : "Drills"}
            </span>
          </div>
        </section>
      )}

      {/* Status: loading/error */}
      {(state.kind === "loading" || state.kind === "error") && (
        <section className="nk-stack-lg pt-32">
          {state.kind === "loading" ? (
            <div className="nk-card p-6">
              <span className="nk-eyebrow text-white/40">Loading</span>
              <p className="font-extrabold mt-1">Preparing library…</p>
            </div>
          ) : (
            <div className="nk-card p-6">
              <span className="nk-eyebrow text-white/40">Unavailable</span>
              <p className="font-extrabold mt-1">Library could not load</p>
              <p className="text-xs text-white/55 mt-1.5">{state.message}</p>
              {state.onRetry && (
                <button
                  type="button"
                  onClick={state.onRetry}
                  className="nk-cta-ghost mt-4"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* LEVEL 1 — categories */}
      {state.kind === "ready" && !openCategory && (
        <section className="nk-stack-lg pt-32">
          <h2 className="nk-h-section">Pick a Category</h2>
          <div className="flex flex-col gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon
              const count = cat.items.length
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setOpenCategoryId(cat.id)}
                  className="nk-tile gap-4 p-5"
                >
                  <div className="size-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="nk-eyebrow text-white/40">
                      {count} {count === 1 ? "drill" : "drills"}
                    </span>
                    <p className="text-xl font-black tracking-tight uppercase leading-none mt-1.5 mb-1.5">
                      {cat.name}
                    </p>
                    <p className="text-xs text-white/55 line-clamp-1">
                      {cat.description}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-white/35 shrink-0" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* LEVEL 2 — drills */}
      {state.kind === "ready" && openCategory && (
        <section className="nk-stack-lg pt-32">
          {openCategory.items.length === 0 ? (
            <div className="nk-card p-8 text-center">
              <div className="size-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                <Folder className="size-6 text-white/60" />
              </div>
              <p className="font-extrabold text-base">No drills yet</p>
              <p className="text-xs text-white/45 mt-1">
                Videos will appear here once added.
              </p>
            </div>
          ) : (
            <>
              <h2 className="nk-h-section">All Drills</h2>
              <div className="flex flex-col gap-2.5">
                {openCategory.items.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlayingItem(item)}
                    className="nk-tile gap-4 p-4"
                  >
                    <div className="size-12 rounded-xl bg-white text-black flex items-center justify-center shrink-0 relative">
                      {item.kind === "video" ? (
                        <Play
                          className="size-5 fill-current"
                          strokeWidth={0}
                        />
                      ) : (
                        <ImageIcon className="size-5" />
                      )}
                      <span className="absolute -top-1.5 -right-1.5 nk-num text-[10px] font-black bg-black text-white border border-white/20 rounded-full size-5 flex items-center justify-center">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm leading-tight line-clamp-2">
                        {item.name}
                      </p>
                      <span className="nk-eyebrow text-white/40 mt-1.5 inline-block">
                        {item.kind === "video" ? "Video" : "Image"}
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-white/30 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <MediaModal item={playingItem} onClose={() => setPlayingItem(null)} />
    </div>
  )
}

/* ============================================================
   FULLSCREEN MEDIA PLAYER — Nike style
   - Pure black backdrop
   - Auto-hides chrome after 2.5s of no interaction
   - Tap once on the video to toggle controls
   - Tap outside to close
   ============================================================ */

function MediaModal({
  item,
  onClose,
}: {
  item: MediaItem | null
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const hideTimerRef = useRef<number | null>(null)

  const showChrome = () => {
    setChromeVisible(true)
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => setChromeVisible(false), 2500)
  }

  useEffect(() => {
    if (!item) return
    showChrome()
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => {
      window.removeEventListener("keydown", handler)
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, onClose])

  useEffect(() => {
    if (item?.kind === "video" && videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {
        /* autoplay can be blocked — user can press play manually */
      })
    }
  }, [item])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={onClose}
      onMouseMove={showChrome}
      onTouchStart={showChrome}
    >
      {/* Top chrome */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-300 ${
          chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] gap-3">
          <div className="min-w-0 flex-1">
            <span className="nk-eyebrow text-white/55">Now Playing</span>
            <h2 className="font-extrabold text-sm sm:text-base mt-0.5 truncate text-white">
              {item.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 nk-icon-btn"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div
        className="flex-1 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {item.kind === "video" ? (
          <video
            ref={videoRef}
            src={item.src}
            controls
            playsInline
            className="max-w-full max-h-full bg-black"
            onPlay={showChrome}
            onPause={() => setChromeVisible(true)}
          />
        ) : (
          <img
            src={item.src}
            alt={item.name}
            className="max-w-full max-h-full object-contain"
          />
        )}
      </div>
    </div>
  )
}
