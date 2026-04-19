import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

export interface SwipeStackProps {
  /**
   * A stable identifier for the current "page" — when this changes externally,
   * the stack animates to it (used for taps/buttons that change the index).
   */
  itemKey: string | number
  /** Render function for the current item. */
  renderCurrent: () => ReactNode
  /**
   * Render the previous item (shown on the left). Return `null` if there is
   * no previous (first item) — the stack will apply a "rubber-band" boundary.
   */
  renderPrev?: () => ReactNode | null
  /** Render the next item (shown on the right). Return `null` if there is no next. */
  renderNext?: () => ReactNode | null
  /** Called when the user finishes a swipe to the previous item. */
  onSwipePrev?: () => void
  /** Called when the user finishes a swipe to the next item. */
  onSwipeNext?: () => void
  /**
   * Whether swipe gestures are enabled. Set to false when an overlay/modal is
   * open so the user doesn't accidentally trigger navigation.
   */
  enabled?: boolean
  /** Optional extra class on the viewport. */
  className?: string
}

type Phase =
  | { kind: "idle" }
  | { kind: "dragging"; dx: number }
  | { kind: "snap-back" }
  | { kind: "snap-prev" }
  | { kind: "snap-next" }

/**
 * Snap-style horizontal swipe between three rendered slides (prev / current / next).
 *
 * Behavior:
 * - During a drag, the 3 slides translate together with the finger.
 * - On release, snaps to prev/next if the user dragged > 25% of the viewport
 *   OR > 60px with > 0.5 px/ms velocity. Otherwise snaps back.
 * - When the snap animation finishes, calls `onSwipePrev`/`onSwipeNext` so the
 *   parent can update its state. Then `itemKey` changes and the stack rerenders
 *   the new (current/prev/next) trio at offset 0.
 *
 * Designed for streams of dynamic items (workout sets/exercises, photo carousel,
 * etc.) — unlike SwipeTabs which assumes a static known list.
 */
export function SwipeStack({
  itemKey,
  renderCurrent,
  renderPrev,
  renderNext,
  onSwipePrev,
  onSwipeNext,
  enabled = true,
  className,
}: SwipeStackProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const startRef = useRef<{
    x: number
    y: number
    at: number
    locked: "h" | "v" | null
  } | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  // When itemKey changes (parent committed to a new slide), reset to centered.
  useEffect(() => {
    setPhase({ kind: "idle" })
  }, [itemKey])

  const prev = renderPrev?.() ?? null
  const next = renderNext?.() ?? null
  const canPrev = prev != null
  const canNext = next != null

  const ignoreTarget = (t: EventTarget | null): boolean => {
    if (!t || !(t instanceof HTMLElement)) return false
    return Boolean(
      t.closest(
        'input, textarea, select, button, a, video, [role="slider"], [data-no-swipe="true"], [data-radix-scroll-area-viewport]',
      ),
    )
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enabled) return
    if (e.touches.length !== 1) return
    if (ignoreTarget(e.target)) return
    const t = e.touches[0]
    startRef.current = {
      x: t.clientX,
      y: t.clientY,
      at: Date.now(),
      locked: null,
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enabled) return
    const start = startRef.current
    if (!start) return
    const t = e.touches[0]
    if (!t) return
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y

    if (start.locked == null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      start.locked = Math.abs(dx) > Math.abs(dy) * 1.15 ? "h" : "v"
    }
    if (start.locked !== "h") return

    // Boundary resistance: if dragging towards a side that has nothing.
    const goingPrev = dx > 0
    const goingNext = dx < 0
    let damped = dx
    if ((goingPrev && !canPrev) || (goingNext && !canNext)) {
      damped = dx * 0.35
    }
    setPhase({ kind: "dragging", dx: damped })
  }

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = startRef.current
      startRef.current = null
      if (!enabled || !start || start.locked !== "h") {
        setPhase({ kind: "idle" })
        return
      }

      const t = e.changedTouches[0]
      if (!t) {
        setPhase({ kind: "snap-back" })
        return
      }

      const dx = t.clientX - start.x
      const dt = Math.max(1, Date.now() - start.at)
      const velocity = Math.abs(dx) / dt
      const viewport = viewportRef.current?.offsetWidth ?? window.innerWidth

      const distanceTriggered = Math.abs(dx) > viewport * 0.25
      const flickTriggered = Math.abs(dx) > 60 && velocity > 0.5

      const goPrev =
        (distanceTriggered || flickTriggered) && dx > 0 && canPrev
      const goNext =
        (distanceTriggered || flickTriggered) && dx < 0 && canNext

      if (goPrev) {
        setPhase({ kind: "snap-prev" })
      } else if (goNext) {
        setPhase({ kind: "snap-next" })
      } else {
        setPhase({ kind: "snap-back" })
      }
    },
    [canNext, canPrev, enabled],
  )

  const handleTouchCancel = () => {
    startRef.current = null
    setPhase({ kind: "snap-back" })
  }

  // Once the snap animation ends, notify parent so it can change itemKey.
  // Then the useEffect on itemKey resets us to phase: idle (centered).
  const handleTransitionEnd = () => {
    if (phase.kind === "snap-prev") onSwipePrev?.()
    else if (phase.kind === "snap-next") onSwipeNext?.()
    else if (phase.kind === "snap-back") setPhase({ kind: "idle" })
  }

  // translateX based on phase
  let translate = "0px"
  let transition: string | undefined = undefined
  switch (phase.kind) {
    case "idle":
      translate = "0px"
      transition = "none"
      break
    case "dragging":
      translate = `${phase.dx}px`
      transition = "none"
      break
    case "snap-back":
      translate = "0px"
      transition = "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)"
      break
    case "snap-prev":
      translate = "100%"
      transition = "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)"
      break
    case "snap-next":
      translate = "-100%"
      transition = "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)"
      break
  }

  return (
    <div
      ref={viewportRef}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="relative w-full"
        style={{
          transform: `translate3d(${translate}, 0, 0)`,
          transition,
          willChange: "transform",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Center: current slide — establishes the height of the stack. */}
        <div className="w-full">{renderCurrent()}</div>

        {/* Left: previous slide, positioned just off-screen on the left. */}
        {canPrev && (
          <div
            className="absolute top-0 right-full w-full"
            aria-hidden
            style={{ pointerEvents: "none" }}
          >
            {prev}
          </div>
        )}

        {/* Right: next slide, positioned just off-screen on the right. */}
        {canNext && (
          <div
            className="absolute top-0 left-full w-full"
            aria-hidden
            style={{ pointerEvents: "none" }}
          >
            {next}
          </div>
        )}
      </div>
    </div>
  )
}
