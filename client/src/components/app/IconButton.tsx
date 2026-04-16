import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type IconButtonProps = React.ComponentProps<typeof Button>

export function IconButton({ className, ...props }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-xl", className)}
      {...props}
    />
  )
}

