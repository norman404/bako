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
    <div className={cn("grid gap-1.5 rounded-card border border-hairline p-1 sm:grid-cols-2", className)}>
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
              "rounded-card border px-3 py-2.5 text-left transition-[border-color,background-color,color] duration-150",
              isActive
                ? "segmented-option-active text-ink"
                : "segmented-option-inactive border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-card border transition-colors duration-150",
                  isActive
                    ? "border-champagne/45 bg-obsidian-raised/70 text-champagne"
                    : "border-hairline bg-obsidian text-ink-dim"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current">
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
