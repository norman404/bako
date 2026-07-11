import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus, X } from "lucide-react";

import type { ModifierGroup, ModifierOption, SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";
import { calculateItemUnitPrice } from "@/modules/menu/lib/modifier-price";
import { formatPosCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ProductCustomizationDialogProps {
  product: Product;
  groups: ModifierGroup[];
  open: boolean;
  onConfirm: (modifiers: SelectedModifier[]) => void;
  onClose: () => void;
}

interface OptionSelection {
  optionId: string;
  selected: boolean;
}

interface TextSelection {
  textValue: string;
}

type GroupSelectionState =
  | { kind: "single"; selections: Map<string, OptionSelection> }
  | { kind: "multiple"; selections: Map<string, OptionSelection> }
  | { kind: "text"; text: TextSelection }
  | { kind: "single_text"; selections: Map<string, OptionSelection>; text: TextSelection };

// =====================================================================
// Pure helpers — domain logic, no React
// =====================================================================

function buildInitialSelection(group: ModifierGroup): GroupSelectionState {
  if (group.type === "text") {
    return { kind: "text", text: { textValue: "" } };
  }

  const selections = new Map<string, OptionSelection>();
  for (const option of group.options) {
    selections.set(option.id, { optionId: option.id, selected: option.isDefault });
  }

  if (group.type === "single_text") {
    return { kind: "single_text", selections, text: { textValue: "" } };
  }

  if (group.type === "multiple") {
    return { kind: "multiple", selections };
  }

  return { kind: "single", selections };
}

function isGroupSatisfied(group: ModifierGroup, state: GroupSelectionState): boolean {
  if (!group.required) return true;

  if (state.kind === "text") {
    return state.text.textValue.trim().length > 0;
  }

  if (state.kind === "single_text") {
    const hasOption = [...state.selections.values()].some((s) => s.selected);
    return hasOption;
  }

  return [...state.selections.values()].some((s) => s.selected);
}

function getSelectedOptions(state: GroupSelectionState): string[] {
  if (state.kind === "text") return [];
  return [...state.selections.values()].filter((s) => s.selected).map((s) => s.optionId);
}

function findOption(group: ModifierGroup, optionId: string): ModifierOption | undefined {
  return group.options.find((o) => o.id === optionId);
}

function buildSelectedModifiers(
  groups: ModifierGroup[],
  states: Map<string, GroupSelectionState>,
): SelectedModifier[] {
  const result: SelectedModifier[] = [];

  for (const group of groups) {
    const state = states.get(group.id);
    if (!state) continue;

    if (state.kind === "text") {
      if (state.text.textValue.trim().length > 0) {
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: null,
          optionName: null,
          priceDelta: 0,
          textValue: state.text.textValue,
        });
      }
      continue;
    }

    if (state.kind === "single_text") {
      const selectedIds = getSelectedOptions(state);
      for (const optionId of selectedIds) {
        const option = findOption(group, optionId);
        if (!option) continue;
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
          textValue: state.text.textValue.trim().length > 0 ? state.text.textValue : null,
        });
      }
      continue;
    }

    const selectedIds = getSelectedOptions(state);
    for (const optionId of selectedIds) {
      const option = findOption(group, optionId);
      if (!option) continue;
      result.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionName: option.name,
        priceDelta: option.priceDelta,
        textValue: null,
      });
    }
  }

  return result;
}

// =====================================================================
// Formatting
// =====================================================================

function formatSurcharge(delta: number): string {
  if (delta === 0) return "";
  const sign = delta > 0 ? "+" : "−"; // typographic minus, not hyphen
  return `${sign}${formatPosCurrency(Math.abs(delta))}`;
}

// =====================================================================
// Subcomponents
// =====================================================================

interface ModifierOptionChipProps {
  option: ModifierOption;
  groupKind: "single" | "multiple" | "single_text";
  selected: boolean;
  onToggle: () => void;
}

function ModifierOptionChip({
  option,
  groupKind,
  selected,
  onToggle,
}: ModifierOptionChipProps) {
  const role = groupKind === "multiple" ? "checkbox" : "radio";
  const ariaChecked = selected;
  const surcharge = formatSurcharge(option.priceDelta);

  return (
    <button
      type="button"
      role={role}
      aria-checked={ariaChecked}
      aria-label={option.name}
      data-testid={`modifier-option-${option.id}`}
      data-selected={selected ? "true" : undefined}
      onClick={onToggle}
      className={cn(
        "group/chip flex w-full cursor-pointer items-center gap-3 rounded-card border px-3.5 py-2.5 text-left text-sm transition-[border-color,background-color,color,box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        selected
          ? "border-primary bg-primary/15 text-text shadow-primary"
          : "border-border bg-surface-raised text-text hover:border-border-strong hover:bg-surface-sunken",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-sharp border transition-colors duration-200",
          selected
            ? "border-primary bg-primary text-on-primary"
            : "border-border-strong bg-surface text-transparent group-hover/chip:text-text-dim",
        )}
      >
        {role === "checkbox" ? (
          <Check className="h-3 w-3" strokeWidth={3} />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </span>

      <span className="flex-1 font-medium">{option.name}</span>

      {surcharge ? (
        <span
          data-testid="option-surcharge"
          className={cn(
            "font-mono-tabular text-xs",
            option.priceDelta > 0 ? "text-text-muted" : "text-success",
          )}
        >
          {surcharge}
        </span>
      ) : null}
    </button>
  );
}

interface ModifierGroupSectionProps {
  group: ModifierGroup;
  state: GroupSelectionState;
  onToggleSingle: (optionId: string) => void;
  onToggleMultiple: (optionId: string) => void;
  onTextChange: (value: string) => void;
}

function ModifierGroupSection({
  group,
  state,
  onToggleSingle,
  onToggleMultiple,
  onTextChange,
}: ModifierGroupSectionProps) {
  const { t } = useTranslation("menu");
  const isSingle = state.kind === "single" || state.kind === "single_text";
  const isMultiple = state.kind === "multiple";
  const role = isSingle ? "radiogroup" : "group";
  const ariaLabel = group.name;
  const groupKind: "single" | "multiple" | "single_text" = isSingle
    ? state.kind === "single_text"
      ? "single_text"
      : "single"
    : "multiple";

  return (
    <section
      data-testid={`modifier-group-${group.id}`}
      className="space-y-2.5"
    >
      <header className="flex items-center gap-2">
        <h4 className="text-sm font-semibold tracking-tight text-text">
          {group.name}
        </h4>
        {group.required ? (
          <span
            data-testid="group-required-badge"
            className="inline-flex items-center gap-1 rounded-sharp border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.12em] text-warning"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
            <span>{t("customizationDialog.requiredLabel")}</span>
          </span>
        ) : (
          <span
            data-testid="group-optional-badge"
            className="inline-flex items-center rounded-sharp border border-border bg-surface-sunken px-1.5 py-0.5 text-2xs font-medium uppercase tracking-[0.12em] text-text-dim"
          >
            {t("customizationDialog.optionalLabel")}
          </span>
        )}
      </header>

      {isSingle || isMultiple ? (
        <div role={role} aria-label={ariaLabel} className="space-y-1.5">
          {group.options.map((option) => {
            const selected =
              state.selections.get(option.id)?.selected === true;
            return (
              <ModifierOptionChip
                key={option.id}
                option={option}
                groupKind={groupKind}
                selected={selected}
                onToggle={() =>
                  isSingle
                    ? onToggleSingle(option.id)
                    : onToggleMultiple(option.id)
                }
              />
            );
          })}
        </div>
      ) : null}

      {state.kind === "text" || state.kind === "single_text" ? (
        <Textarea
          aria-label={group.name}
          value={state.text.textValue}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t("customizationDialog.commentsPlaceholder")}
          className="min-h-[64px] font-mono-tabular text-sm"
        />
      ) : null}
    </section>
  );
}

interface SelectionSummaryProps {
  product: Product;
  groups: ModifierGroup[];
  states: Map<string, GroupSelectionState>;
}

function SelectionSummary({ product, groups, states }: SelectionSummaryProps) {
  const { t } = useTranslation("menu");
  const modifiers = useMemo(
    () => buildSelectedModifiers(groups, states),
    [groups, states],
  );
  const total = useMemo(
    () => calculateItemUnitPrice(product, modifiers),
    [product, modifiers],
  );

  if (modifiers.length === 0) {
    return (
      <div data-testid="selection-summary" className="space-y-2">
        <p className="eyebrow">{t("customizationDialog.title")}</p>
        <p className="text-xs text-text-dim">
          {t("customizationDialog.commentsPlaceholder")}
        </p>
      </div>
    );
  }

  // Group modifiers by groupName for compact display
  const groupedByName = new Map<string, string[]>();
  for (const m of modifiers) {
    const label = m.optionName ?? m.textValue ?? "";
    if (!label) continue;
    const list = groupedByName.get(m.groupName) ?? [];
    list.push(label);
    groupedByName.set(m.groupName, list);
  }

  return (
    <div data-testid="selection-summary" className="space-y-1.5">
      {Array.from(groupedByName.entries()).map(([groupName, values]) => (
        <p key={groupName} className="text-xs leading-snug text-text-muted">
          <span className="font-semibold text-text">{groupName}:</span>{" "}
          {values.join(", ")}
        </p>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t border-border-strong pt-2">
        <span className="eyebrow">{t("customizationDialog.summaryTotal")}</span>
        <span
          data-testid="summary-total"
          className="font-mono-tabular text-md font-semibold text-text"
        >
          {formatPosCurrency(total)}
        </span>
      </div>
    </div>
  );
}

// =====================================================================
// Main component
// =====================================================================

function ProductCustomizationDialog({
  product,
  groups,
  open,
  onConfirm,
  onClose,
}: ProductCustomizationDialogProps) {
  const { t } = useTranslation("menu");

  const [selectionStates, setSelectionStates] = useState<Map<string, GroupSelectionState>>(() => {
    const map = new Map<string, GroupSelectionState>();
    for (const group of groups) {
      map.set(group.id, buildInitialSelection(group));
    }
    return map;
  });

  const { satisfied, firstUnsatisfiedGroup } = useMemo<{
    satisfied: boolean;
    firstUnsatisfiedGroup: ModifierGroup | null;
  }>(() => {
    for (const group of groups) {
      const state = selectionStates.get(group.id);
      if (!state) {
        if (group.required) {
          return { satisfied: false, firstUnsatisfiedGroup: group };
        }
        continue;
      }
      if (!isGroupSatisfied(group, state)) {
        return { satisfied: false, firstUnsatisfiedGroup: group };
      }
    }
    return { satisfied: true, firstUnsatisfiedGroup: null };
  }, [groups, selectionStates]);

  const runningPrice = useMemo(() => {
    const modifiers = buildSelectedModifiers(groups, selectionStates);
    return calculateItemUnitPrice(product, modifiers);
  }, [groups, selectionStates, product]);

  const toggleSingleOption = (groupId: string, optionId: string) => {
    setSelectionStates((prev) => {
      const next = new Map(prev);
      const state = next.get(groupId);
      if (!state || (state.kind !== "single" && state.kind !== "single_text")) return prev;

      const newSelections = new Map(state.selections);
      for (const [id] of newSelections) {
        newSelections.set(id, { optionId: id, selected: id === optionId });
      }
      if (state.kind === "single_text") {
        next.set(groupId, { kind: "single_text", selections: newSelections, text: state.text });
      } else {
        next.set(groupId, { kind: "single", selections: newSelections });
      }
      return next;
    });
  };

  const toggleMultipleOption = (groupId: string, optionId: string) => {
    setSelectionStates((prev) => {
      const next = new Map(prev);
      const state = next.get(groupId);
      if (!state || state.kind !== "multiple") return prev;

      const newSelections = new Map(state.selections);
      const current = newSelections.get(optionId);
      if (current) {
        newSelections.set(optionId, { optionId, selected: !current.selected });
      }
      next.set(groupId, { kind: "multiple", selections: newSelections });
      return next;
    });
  };

  const updateTextValue = (groupId: string, value: string) => {
    setSelectionStates((prev) => {
      const next = new Map(prev);
      const state = next.get(groupId);
      if (!state) return prev;

      if (state.kind === "text") {
        next.set(groupId, { kind: "text", text: { textValue: value } });
      } else if (state.kind === "single_text") {
        next.set(groupId, { kind: "single_text", selections: state.selections, text: { textValue: value } });
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (!satisfied) return;
    const modifiers = buildSelectedModifiers(groups, selectionStates);
    onConfirm(modifiers);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border-strong px-5 pb-4 pt-5">
          <div
            data-testid="product-hero"
            className="flex items-start gap-3"
          >
            <div
              data-testid="product-image"
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card border border-border-strong bg-surface-sunken text-2xl"
            >
              {product.image}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display text-xl leading-tight text-text">
                {product.name}
              </DialogTitle>
              <p className="mt-0.5 text-2xs uppercase tracking-[0.16em] text-text-dim">
                {t("customizationDialog.title")}
              </p>
            </div>
            <div
              data-testid="product-base-price"
              className="font-mono-tabular text-md font-semibold text-text-muted"
            >
              {formatPosCurrency(product.price)}
            </div>
          </div>
        </DialogHeader>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-dim">
              {t("customizationDialog.commentsPlaceholder")}
            </p>
          ) : (
            groups.map((group) => {
              const state = selectionStates.get(group.id);
              if (!state) return null;

              return (
                <ModifierGroupSection
                  key={group.id}
                  group={group}
                  state={state}
                  onToggleSingle={(optionId) => toggleSingleOption(group.id, optionId)}
                  onToggleMultiple={(optionId) => toggleMultipleOption(group.id, optionId)}
                  onTextChange={(value) => updateTextValue(group.id, value)}
                />
              );
            })
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-border-strong bg-surface-raised/95 px-5 pb-5 pt-4 backdrop-blur">
          <SelectionSummary
            product={product}
            groups={groups}
            states={selectionStates}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">{t("customizationDialog.summaryTotal")}</p>
              <p
                data-testid="footer-total"
                className="font-mono-tabular text-display font-bold leading-none tracking-tight text-text"
              >
                {formatPosCurrency(runningPrice)}
              </p>
              <p
                data-testid="running-price"
                className="sr-only"
              >
                {formatPosCurrency(runningPrice)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="medium" onClick={onClose}>
                  <X className="h-4 w-4" />
                  {t("customizationDialog.cancelButton")}
                </Button>
                <Button
                  data-testid="confirm-button"
                  variant="default"
                  size="large"
                  disabled={!satisfied}
                  onClick={handleConfirm}
                >
                  <Plus className="h-5 w-5" strokeWidth={2.5} />
                  {t("customizationDialog.addButton")}
                </Button>
              </div>
              {firstUnsatisfiedGroup && !satisfied ? (
                <p
                  data-testid="confirm-hint"
                  className="text-2xs text-warning"
                >
                  {t("customizationDialog.missingSelectionHint", { groupName: firstUnsatisfiedGroup.name })}
                </p>
              ) : null}
            </div>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export { ProductCustomizationDialog };
