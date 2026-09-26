import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScheduleWindowForm, WeeklyScheduleForm } from "@/lib/weekly-schedule";
import { cn } from "@/lib/utils";

// Displayed Monday first; values follow Date#getDay (0 = Sunday).
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

interface ScheduleEditorProps {
  value: WeeklyScheduleForm;
  onChange: (value: WeeklyScheduleForm) => void;
  idPrefix: string;
}

function toggleDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((current) => current !== day) : [...days, day];
}

export function ScheduleEditor({ value, onChange, idPrefix }: ScheduleEditorProps) {
  const { t } = useTranslation("common");

  const updateWindow = (index: number, patch: Partial<ScheduleWindowForm>) => {
    onChange({
      ...value,
      windows: value.windows.map((window, current) => (current === index ? { ...window, ...patch } : window)),
    });
  };

  return (
    <div className="grid gap-3">
      {value.windows.map((window, index) => (
        <div key={index} className="grid gap-2 rounded-card border border-border p-2.5">
          <div className="flex flex-wrap gap-1" role="group" aria-label={t("schedule.daysLabel")}>
            {WEEKDAYS.map((day) => {
              const isSelected = window.days.includes(day);
              return (
                <Button
                  key={day}
                  type="button"
                  variant="ghost"
                  size="small"
                  aria-pressed={isSelected}
                  onClick={() => updateWindow(index, { days: toggleDay(window.days, day) })}
                  className={cn(
                    "h-7 min-w-9 border px-2 text-2xs font-semibold uppercase",
                    isSelected ? "border-primary-strong bg-primary/15 text-primary-strong" : "border-border text-text-muted",
                  )}
                >
                  {t(`schedule.weekdays.${day}`)}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-start-${index}`}
              type="time"
              aria-label={t("schedule.startLabel")}
              value={window.start}
              onInput={(event) => updateWindow(index, { start: event.currentTarget.value })}
              className="w-32"
            />
            <span className="text-xs text-text-muted">{t("schedule.until")}</span>
            <Input
              id={`${idPrefix}-end-${index}`}
              type="time"
              aria-label={t("schedule.endLabel")}
              value={window.end}
              onInput={(event) => updateWindow(index, { end: event.currentTarget.value })}
              className="w-32"
            />
            {value.windows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("schedule.removeWindow")}
                onClick={() => onChange({ ...value, windows: value.windows.filter((_, current) => current !== index) })}
                className="ml-auto h-8 w-8 text-text-dim hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        size="small"
        className="justify-self-start"
        onClick={() =>
          onChange({ ...value, windows: [...value.windows, { days: [1, 2, 3, 4, 5], start: "14:00", end: "18:00" }] })
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {t("schedule.addWindow")}
      </Button>

      <p className="text-2xs text-text-dim">{t("schedule.midnightHint")}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-2xs uppercase tracking-[0.12em] text-text-muted" htmlFor={`${idPrefix}-from`}>
          {t("schedule.validFrom")}
          <Input
            id={`${idPrefix}-from`}
            type="date"
            value={value.validFrom}
            onInput={(event) => onChange({ ...value, validFrom: event.currentTarget.value })}
          />
        </label>
        <label className="grid gap-1 text-2xs uppercase tracking-[0.12em] text-text-muted" htmlFor={`${idPrefix}-until`}>
          {t("schedule.validUntil")}
          <Input
            id={`${idPrefix}-until`}
            type="date"
            value={value.validUntil}
            onInput={(event) => onChange({ ...value, validUntil: event.currentTarget.value })}
          />
        </label>
      </div>
    </div>
  );
}
