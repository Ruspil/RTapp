import * as React from "react"

import { cn } from "@/lib/utils"

type SectionProps = React.ComponentProps<"section"> & {
  title?: React.ReactNode
  description?: React.ReactNode
}

export function Section({ className, title, description, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

