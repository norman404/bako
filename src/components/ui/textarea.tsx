import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-[88px] w-full resize-none rounded-card border border-hairline bg-obsidian px-3 py-3",
          "text-[13px] text-ink outline-none",
          "placeholder:text-ink-dim",
          "transition-colors duration-150",
          "focus-visible:border-champagne/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
