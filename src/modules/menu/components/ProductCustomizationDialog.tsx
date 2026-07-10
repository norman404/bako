import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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

  const allSatisfied = useMemo(() => {
    return groups.every((group) => {
      const state = selectionStates.get(group.id);
      if (!state) return !group.required;
      return isGroupSatisfied(group, state);
    });
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
    if (!allSatisfied) return;
    const modifiers = buildSelectedModifiers(groups, selectionStates);
    onConfirm(modifiers);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("customizationDialog.title")} · {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-1">
          {groups.map((group) => {
            const state = selectionStates.get(group.id);
            if (!state) return null;

            return (
              <section key={group.id} className="space-y-2">
                <h4 className="text-sm font-semibold text-text">{group.name}</h4>

                {group.type === "single" && (
                  <div role="radiogroup" aria-label={group.name} className="space-y-1">
                    {group.options.map((option) => {
                      const sel = state.kind === "single" ? state.selections.get(option.id) : undefined;
                      const checked = sel?.selected ?? false;
                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`group-${group.id}`}
                            checked={checked}
                            onChange={() => toggleSingleOption(group.id, option.id)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1">{option.name}</span>
                          {option.priceDelta !== 0 && (
                            <span className="font-mono-tabular text-xs text-text-muted">
                              {option.priceDelta > 0 ? "+" : ""}
                              {formatPosCurrency(option.priceDelta)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {group.type === "multiple" && (
                  <div role="group" aria-label={group.name} className="space-y-1">
                    {group.options.map((option) => {
                      const sel = state.kind === "multiple" ? state.selections.get(option.id) : undefined;
                      const checked = sel?.selected ?? false;
                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMultipleOption(group.id, option.id)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1">{option.name}</span>
                          {option.priceDelta !== 0 && (
                            <span className="font-mono-tabular text-xs text-text-muted">
                              {option.priceDelta > 0 ? "+" : ""}
                              {formatPosCurrency(option.priceDelta)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {group.type === "text" && (
                  <Textarea
                    aria-label={group.name}
                    value={state.kind === "text" ? state.text.textValue : ""}
                    onChange={(e) => updateTextValue(group.id, e.target.value)}
                    placeholder={t("customizationDialog.commentsPlaceholder")}
                  />
                )}

                {group.type === "single_text" && (
                  <div className="space-y-1">
                    <div role="radiogroup" aria-label={group.name} className="space-y-1">
                      {group.options.map((option) => {
                        const sel = state.kind === "single_text" ? state.selections.get(option.id) : undefined;
                        const checked = sel?.selected ?? false;
                        return (
                          <label
                            key={option.id}
                            className="flex cursor-pointer items-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                          >
                            <input
                              type="radio"
                              name={`group-${group.id}`}
                              checked={checked}
                              onChange={() => toggleSingleOption(group.id, option.id)}
                              className="h-4 w-4"
                            />
                            <span className="flex-1">{option.name}</span>
                            {option.priceDelta !== 0 && (
                              <span className="font-mono-tabular text-xs text-text-muted">
                                {option.priceDelta > 0 ? "+" : ""}
                                {formatPosCurrency(option.priceDelta)}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <Textarea
                      aria-label={group.name}
                      value={state.kind === "single_text" ? state.text.textValue : ""}
                      onChange={(e) => updateTextValue(group.id, e.target.value)}
                      placeholder={t("customizationDialog.commentsPlaceholder")}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span data-testid="running-price" className="font-mono-tabular text-lg font-bold text-text">
            {formatPosCurrency(runningPrice)}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="small" onClick={onClose}>
              {t("customizationDialog.cancelButton")}
            </Button>
            <Button
              variant="default"
              size="small"
              disabled={!allSatisfied}
              onClick={handleConfirm}
            >
              {t("customizationDialog.addButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ProductCustomizationDialog };