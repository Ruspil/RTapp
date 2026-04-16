import * as React from "react"

import { cn } from "@/lib/utils"

type ScreenProps = React.ComponentProps<"div"> & {
  padded?: boolean
  maxWidth?: "sm" | "md" | "lg"
}

const MAX_WIDTH: Record<NonNullable<ScreenProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
}

export function Screen({ className, children, padded = false, maxWidth, ...props }: ScreenProps) {
  return (
    <div
      className={cn("min-h-svh w-full", className)}
      {...props}
    >
      {padded ? (
        <div className={cn("mx-auto w-full px-4", maxWidth ? MAX_WIDTH[maxWidth] : "max-w-lg")}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

