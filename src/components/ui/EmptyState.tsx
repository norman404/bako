import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  children: ReactNode;
  className?: string;
}

function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "rounded-card border border-dashed border-border-strong px-4 py-8 text-center text-xs text-text-muted",
      className
    )}>
      {children}
    </div>
  );
}

export { EmptyState };
