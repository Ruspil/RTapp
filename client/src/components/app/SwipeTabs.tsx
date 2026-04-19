import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

export interface SwipeTabsProps<TabId extends string> {
  /** Ordered list of tab ids — order matters for swipe direction. */
  tabs: TabId[]
  /** Currently visible tab. */
  activeTab: TabId
  /** Called when the user swipes to a new tab. */
  onChangeTab: (next: TabId) => void
  /**
   * Render a tab's contents. Called for every tab in `tabs` so all panes mount
   * (needed for the slide effect — they sit side by side off-screen).
   */
  renderTab: (tab: TabId) => ReactNode
  /** Optional extra class on the viewport. */
  className?: string
}

/**
 * Snap-style horizontal swipe between a fixed set of tabs (e.g. Today / Library / Profile).
 *
 * - Tracks the touch and lets the panes follow the finger in real time.
 * - On release, snaps to the next/previous tab if the user dragged > 25% of the
 *   viewport width OR > 60px with > 0.5 px/ms velocity. Otherwise snaps back.
 * - Ignores swipes that start on inputs, buttons, links, videos, or anything
 *   marked `data-no-swipe="true"` so we don't fight other gestures.
 * - Disables itself for primarily-vertical drags (lets the page scroll).
 *
 * Renders ALL tab panes at once, side by side. When a pane isn't visible we
 * give it `pointer-events: none` and `aria-hidden` so taps don't leak.
 */
export function SwipeTabs<TabId extends string>({
  tabs,
  activeTab,
  onChangeTab,
  renderTab,
  className,
}: SwipeTabsProps<TabId>) {
  const idx = Math.max(0, tabs.indexOf(activeTab))
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const startRef = useRef<{
    x: number
    y: number
    at: number
    locked: "h" | "v" | null
  } | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  // When the active tab changes externally (e.g. tap on a bottom tab), animate
  // a smooth slide rather than a hard cut.
  useEffect(() => {
    setIsTransitioning(true)
    setDragX(0)
    const t = setTimeout(() => setIsTransitioning(false), 320)
    return () => clearTimeout(t)
  }, [activeTab])

  const ignoreTarget = (t: EventTarget | null): boolean => {
    if (!t || !(t instanceof HTMLElement)) return false
    return Boolean(
      t.closest(
        'input, textarea, select, button, a, video, [role="slider"], [data-no-swipe="true"], [data-radix-scroll-area-viewport]',
      ),
    )
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    if (ignoreTarget(e.target)) return
    const t = e.touches[0]
    startRef.current = { x: t.clientX, y: t.clientY, at: Date.now(), locked: null }
    setIsDragging(false)
    setIsTransitioning(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const start = startRef.current
    if (!start) return
    const t = e.touches[0]
    if (!t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y

    // Decide axis once the user has moved enough — sticky after that.
    if (start.locked == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      start.locked = Math.abs(dx) > Math.abs(dy) * 1.15 ? "h" : "v"
    }
    if (start.locked !== "h") return

    setIsDragging(true)
    // Resistance at the boundaries (first/last tab) — half the drag.
    const atStart = idx === 0 && dx > 0
    const atEnd = idx === tabs.length - 1 && dx < 0
    const damped = atStart || atEnd ? dx * 0.35 : dx
    setDragX(damped)
  }

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = startRef.current
      startRef.current = null
      if (!start || start.locked !== "h") {
        setIsDragging(false)
        setDragX(0)
        return
      }

      const t = e.changedTouches[0]
      if (!t) {
        setIsDragging(false)
        setDragX(0)
        return
      }

      const dx = t.clientX - start.x
      const dt = Math.max(1, Date.now() - start.at)
      const velocity = Math.abs(dx) / dt // px/ms
      const viewport = viewportRef.current?.offsetWidth ?? window.innerWidth

      const distanceTriggered = Math.abs(dx) > viewport * 0.25
      const flickTriggered = Math.abs(dx) > 60 && velocity > 0.5

      let nextIdx = idx
      if ((distanceTriggered || flickTriggered) && dx < 0 && idx < tabs.length - 1) {
        nextIdx = idx + 1
      } else if (
        (distanceTriggered || flickTriggered) &&
        dx > 0 &&
        idx > 0
      ) {
        nextIdx = idx - 1
      }

      setIsDragging(false)
      // Always re-enable transition for the snap-back / snap-forward.
      setIsTransitioning(true)

      if (nextIdx !== idx) {
        // Snap to the new tab — the parent's setState will trigger our
        // useEffect which keeps the transition class on briefly.
        setDragX(0)
        onChangeTab(tabs[nextIdx])
      } else {
        // Snap back to current.
        setDragX(0)
        const t = setTimeout(() => setIsTransitioning(false), 280)
        // Best-effort cleanup — if user re-drags before this fires, the next
        // touchstart resets state anyway.
        return () => clearTimeout(t)
      }
    },
    [idx, onChangeTab, tabs],
  )

  const handleTouchCancel = () => {
    startRef.current = null
    setIsDragging(false)
    setIsTransitioning(true)
    setDragX(0)
  }

  const baseTranslate = -idx * 100
  const dragPct = viewportRef.current?.offsetWidth
    ? (dragX / viewportRef.current.offsetWidth) * 100
    : 0
  const totalTranslate = `calc(${baseTranslate}% + ${dragX}px)`

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative w-full h-svh overflow-hidden",
        className,
      )}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="flex w-full h-full"
        style={{
          transform: `translate3d(${totalTranslate}, 0, 0)`,
          transition: isDragging
            ? "none"
            : isTransitioning
              ? "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)"
              : "none",
          willChange: "transform",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab === activeTab
          return (
            <div
              key={tab}
              className={cn(
                "w-full h-full shrink-0 overflow-y-auto overflow-x-hidden",
                !isActive && !isDragging && "pointer-events-none",
              )}
              style={{ minWidth: "100%" }}
              aria-hidden={!isActive ? true : undefined}
            >
              {renderTab(tab)}
            </div>
          )
        })}
      </div>
      {/* Suppress unused warning while keeping value computed for future overlay. */}
      <span className="hidden">{dragPct}</span>
    </div>
  )
}
