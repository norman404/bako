import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import {
  formatProductPriceInput,
  parseProductPriceInput,
} from "@/modules/menu/lib/product-price";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface OptionsEditorOption {
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface OptionsEditorProps {
  options: OptionsEditorOption[];
  onChange: (options: OptionsEditorOption[]) => void;
  /**
   * Modifier group kind. Controls whether only one option can be `isDefault: true`
   * (single / single_text) or many (multiple / text).
   */
  groupKind: "single" | "multiple" | "text" | "single_text";
  /**
   * Whether the editor is read-only (e.g. while a save is in flight).
   */
  disabled?: boolean;
}

function newEmptyOption(sortOrder: number): OptionsEditorOption {
  return { name: "", priceDelta: 0, isDefault: false, sortOrder };
}

function normalizeSortOrders(options: OptionsEditorOption[]): OptionsEditorOption[] {
  return options.map((o, i) => ({ ...o, sortOrder: i }));
}

export { OptionsEditor };

function OptionsEditor({ options, onChange, groupKind, disabled = false }: OptionsEditorProps) {
  const { t } = useTranslation("settings");
  const enforceSingleDefault = groupKind === "single" || groupKind === "single_text";
  const [editingPrice, setEditingPrice] = useState<Record<number, string>>({});

  const getPriceDisplayValue = (index: number, priceDelta: number) => {
    if (index in editingPrice) return editingPrice[index];
    return priceDelta === 0 ? "" : formatProductPriceInput(priceDelta);
  };

  const handlePriceInput = (index: number, raw: string) => {
    setEditingPrice((previous) => ({ ...previous, [index]: raw }));
    const parsed = parseProductPriceInput(raw);
    handleFieldChange(index, "priceDelta", parsed ?? 0);
  };

  const handlePriceBlur = (index: number) => {
    setEditingPrice((previous) => {
      const next = { ...previous };
      delete next[index];
      return next;
    });
  };

  const handleAdd = () => {
    onChange(normalizeSortOrders([...options, newEmptyOption(options.length)]));
  };

  const handleRemove = (index: number) => {
    onChange(normalizeSortOrders(options.filter((_, i) => i !== index)));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalizeSortOrders(next));
  };

  const handleFieldChange = <K extends keyof OptionsEditorOption>(
    index: number,
    field: K,
    value: OptionsEditorOption[K],
  ) => {
    onChange(options.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  };

  const handleDefaultToggle = (index: number, next: boolean) => {
    onChange(
      options.map((o, i) => {
        if (i !== index) {
          // Enforce exclusivity for single / single_text
          if (enforceSingleDefault && next) {
            return { ...o, isDefault: false };
          }
          return o;
        }
        return { ...o, isDefault: next };
      }),
    );
  };

  return (
    <section
      data-testid="options-editor"
      className="space-y-2"
      aria-label={t("modifierGroups.optionsSection")}
    >
      <header className="flex items-center justify-between gap-2">
        <p className="eyebrow">{t("modifierGroups.optionsSection")}</p>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={handleAdd}
          disabled={disabled}
          aria-label={t("modifierGroups.addOption")}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("modifierGroups.addOption")}
        </Button>
      </header>

      {options.length === 0 ? (
        <p
          data-testid="options-empty-hint"
          className="rounded-card border border-dashed border-border px-3 py-3 text-2xs text-text-dim"
        >
          {t("modifierGroups.emptyOptionsHint")}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {options.map((option, index) => {
            const isFirst = index === 0;
            const isLast = index === options.length - 1;

            return (
              <li
                key={`opt-${index}`}
                data-testid={`option-row-${index}`}
                className={cn(
                  "flex items-center gap-2 rounded-card border border-border bg-surface-raised px-2.5 py-2",
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={disabled || isFirst}
                    aria-label={t("modifierGroups.moveUp")}
                    className="flex h-5 w-5 items-center justify-center rounded-sharp text-text-dim hover:bg-surface-sunken hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={disabled || isLast}
                    aria-label={t("modifierGroups.moveDown")}
                    className="flex h-5 w-5 items-center justify-center rounded-sharp text-text-dim hover:bg-surface-sunken hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex-1">
                  <Input
                    aria-label={t("modifierGroups.optionNameLabel")}
                    value={option.name}
                    onInput={(e) => handleFieldChange(index, "name", e.currentTarget.value)}
                    placeholder={t("modifierGroups.optionNameLabel")}
                    disabled={disabled}
                    className="h-8"
                  />
                </div>

                <div className="w-20">
                  {/* ADR-0001: option prices are integer cents; the input shows monetary units. */}
                  <Input
                    aria-label={t("modifierGroups.optionPriceLabel")}
                    inputMode="decimal"
                    value={getPriceDisplayValue(index, option.priceDelta)}
                    onInput={(e) => handlePriceInput(index, e.currentTarget.value)}
                    onBlur={() => handlePriceBlur(index)}
                    placeholder="0.00"
                    disabled={disabled}
                    className="h-8 font-mono-tabular text-right"
                  />
                </div>

                <label className="flex h-8 items-center gap-1.5 rounded-sharp px-2 text-2xs uppercase tracking-[0.12em] text-text-muted">
                  <input
                    type="checkbox"
                    aria-label={t("modifierGroups.optionDefaultLabel")}
                    checked={option.isDefault}
                    onChange={(e) => handleDefaultToggle(index, e.currentTarget.checked)}
                    disabled={disabled}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="hidden sm:inline">
                    {t("modifierGroups.optionDefaultLabel")}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  aria-label={t("modifierGroups.removeOption", { defaultValue: "Eliminar opción" })}
                  className="flex h-7 w-7 items-center justify-center rounded-sharp text-text-dim hover:bg-surface-sunken hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
