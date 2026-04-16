import * as React from "react"

import { cn } from "@/lib/utils"

type StatTileProps = React.ComponentProps<"div"> & {
  label: React.ReactNode
  value: React.ReactNode
  tone?: "neutral" | "success" | "danger"
}

const TONE: Record<NonNullable<StatTileProps["tone"]>, { value: string; surface: string }> = {
  neutral: { value: "text-foreground", surface: "bg-muted/50" },
  success: { value: "text-emerald-500", surface: "bg-emerald-500/10" },
  danger: { value: "text-destructive", surface: "bg-destructive/10" },
}

export function StatTile({
  className,
  label,
  value,
  tone = "neutral",
  ...props
}: StatTileProps) {
  const t = TONE[tone]
  return (
    <div
      className={cn("rounded-xl border border-border/40 p-3", t.surface, className)}
      {...props}
    >
      <div className={cn("font-black text-2xl tabular-nums leading-none", t.value)}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

