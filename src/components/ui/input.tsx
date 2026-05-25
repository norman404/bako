import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "h-9 w-full rounded-card border border-hairline bg-obsidian px-3",
          "text-[13px] text-ink outline-none",
          "placeholder:text-ink-dim",
          "transition-colors duration-150",
          "focus-visible:border-champagne/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
