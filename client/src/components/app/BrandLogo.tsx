import { cn } from "@/lib/utils"

export interface BrandLogoProps {
  /**
   * Visual variant:
   * - "solid" → white tile with black "RT" inside (default, most Nike-like)
   * - "outline" → black tile with white border + white "RT"
   */
  variant?: "solid" | "outline"
  /**
   * Tailwind size class for the tile (default "size-9").
   */
  className?: string
}

/**
 * Brand mark for the app — a chunky monogram tile reminiscent of the
 * Nike app's logo block. Uses extreme weight + tight tracking to feel
 * iconic at small sizes.
 */
export function BrandLogo({
  variant = "solid",
  className,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md select-none shrink-0",
        variant === "solid"
          ? "bg-white text-black"
          : "bg-black text-white border border-white/15",
        "size-9",
        className,
      )}
      aria-label="Ruspil Training"
    >
      <span
        className="font-black tracking-[-0.06em] leading-none"
        style={{ fontSize: "0.95em", letterSpacing: "-0.08em" }}
      >
        RT
      </span>
    </div>
  )
}
