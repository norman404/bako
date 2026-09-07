import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SegmentedOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  activeValue: string;
  onSelect: (value: string) => void;
  className?: string;
  compact?: boolean;
  ariaLabel?: string;
}

function SegmentedControl({ options, activeValue, onSelect, className, compact = false, ariaLabel }: SegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "grid rounded-card border border-border p-1",
        compact ? "auto-cols-fr grid-flow-col gap-1 bg-surface-sunken" : "gap-1.5 sm:grid-cols-2",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === activeValue;
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            variant="ghost"
            onClick={() => onSelect(option.value)}
            aria-pressed={isActive}
            className={cn(
              "rounded-card border transition-[border-color,background-color,color] duration-200",
              compact ? "min-h-11 min-w-0 items-center justify-center px-2 py-2" : "px-3 py-2.5 text-left",
              isActive
                ? "segmented-option-active"
                : "segmented-option-inactive border-transparent text-text-muted hover:border-border-strong hover:text-text",
              compact && isActive && "hover:border-primary-strong hover:bg-primary-strong hover:text-on-primary",
            )}
          >
            <span className={cn("flex min-w-0 items-center", compact ? "justify-center gap-2" : "gap-2.5")}>
              {Icon ? (
                compact ? <Icon className="h-4 w-4" aria-hidden="true" /> : (
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-card border transition-colors duration-200",
                      isActive
                        ? "border-on-primary/40 bg-on-primary/15 text-on-primary"
                        : "border-border bg-surface text-text-dim",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                )
              ) : null}
              <span className={compact ? "text-sm font-semibold leading-4" : "text-2xs font-semibold uppercase tracking-[0.16em] text-current"}>
                {option.label}
              </span>
            </span>
          </Button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
