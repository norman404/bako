import { type ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ref, ...props }: ComponentProps<"input">) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full rounded-card border border-border bg-surface-raised px-3",
        "text-sm text-text outline-none",
        "placeholder:text-text-dim",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
