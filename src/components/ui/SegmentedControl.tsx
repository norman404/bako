import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SegmentedOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  activeValue: string;
  onSelect: (value: string) => void;
  className?: string;
}

function SegmentedControl({ options, activeValue, onSelect, className }: SegmentedControlProps) {
  return (
    <div className={cn("grid gap-1.5 rounded-card border border-border p-1 sm:grid-cols-2", className)}>
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
              "rounded-card border px-3 py-2.5 text-left transition-[border-color,background-color,color] duration-200",
              isActive
                ? "segmented-option-active"
                : "segmented-option-inactive border-transparent text-text-muted hover:border-border-strong hover:text-text"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-card border transition-colors duration-200",
                  isActive
                    ? "border-on-primary/40 bg-on-primary/15 text-on-primary"
                    : "border-border bg-surface text-text-dim"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-current">
                {option.label}
              </span>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
