import { Archive, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ModifierGroup, ModifierGroupType } from "@/modules/menu/domain/modifier-group";
import type { ModifierGroupUpsertInput } from "@/modules/menu/domain/ports";
import {
  useArchiveModifierGroup,
  useAssignModifierGroup,
  useCreateModifierGroup,
  useModifierGroups,
} from "@/modules/menu/hooks/use-modifier-groups";
import { useCategories } from "@/modules/menu/hooks/use-categories";
import { useProducts } from "@/modules/menu/hooks/use-products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/FormField";

interface OptionFormState {
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

interface GroupFormState {
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
}

function buildEmptyFormState(): GroupFormState {
  return { name: "", type: "single", required: false, sortOrder: 0 };
}

function ModifierGroupSettingsPanel() {
  const { t } = useTranslation("settings");
  const { data: groups = [] } = useModifierGroups();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const createMutation = useCreateModifierGroup();
  const archiveMutation = useArchiveModifierGroup();
  const assignMutation = useAssignModifierGroup();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GroupFormState>(buildEmptyFormState);
  const [options, setOptions] = useState<OptionFormState[]>([]);

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { name: "", priceDelta: 0, isDefault: false }]);
  };

  const handleArchive = (group: ModifierGroup) => {
    const shouldArchive = window.confirm(
      t("modifierGroups.confirmArchive", { name: group.name }),
    );
    if (!shouldArchive) return;
    void archiveMutation.mutateAsync(group.id);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: ModifierGroupUpsertInput = {
      name: formState.name,
      type: formState.type,
      required: formState.required,
      sortOrder: formState.sortOrder,
      options: options.map((opt, i) => ({
        name: opt.name,
        priceDelta: opt.priceDelta,
        isDefault: opt.isDefault,
        sortOrder: i,
      })),
    };
    void createMutation.mutateAsync(payload);
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (!selectedGroupId) return;
    void assignMutation.mutateAsync({ groupId: selectedGroupId, categoryId });
  };

  const handleProductToggle = (productId: string) => {
    if (!selectedGroupId) return;
    void assignMutation.mutateAsync({ groupId: selectedGroupId, productId });
  };

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">
          {t("modifierGroups.title")}
        </h2>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.id} className="flex items-stretch gap-1">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedGroupId(group.id)}
                  className="w-full justify-start"
                >
                  {group.name}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("modifierGroups.archiveButton", { name: group.name })}
                  onClick={() => handleArchive(group)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {groups.length === 0 ? (
              <p className="text-xs text-text-dim">{t("modifierGroups.emptyState")}</p>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {t("modifierGroups.createNew")}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={handleSubmit}>
            <FormField label={t("modifierGroups.nameLabel")} htmlFor="mod-name">
              <Input
                id="mod-name"
                value={formState.name}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  setFormState((p) => ({ ...p, name: value }));
                }}
                placeholder={t("modifierGroups.namePlaceholder")}
              />
            </FormField>

            <FormField label={t("modifierGroups.typeLabel")} htmlFor="mod-type">
              <select
                id="mod-type"
                value={formState.type}
                onChange={(e) => {
                  const value = e.currentTarget.value as ModifierGroupType;
                  setFormState((p) => ({ ...p, type: value }));
                }}
                className="h-9 w-full rounded-card border border-border bg-surface-raised px-3 text-sm text-text"
              >
                <option value="single">{t("modifierGroups.typeSingle")}</option>
                <option value="multiple">{t("modifierGroups.typeMultiple")}</option>
                <option value="text">{t("modifierGroups.typeText")}</option>
                <option value="single_text">{t("modifierGroups.typeSingleText")}</option>
              </select>
            </FormField>

            <FormField label={t("modifierGroups.requiredLabel")} htmlFor="mod-required">
              <input
                id="mod-required"
                type="checkbox"
                checked={formState.required}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFormState((p) => ({ ...p, required: checked }));
                }}
              />
            </FormField>

            <div className="border-t border-border pt-2.5">
              <p className="text-2xs mb-1 font-medium uppercase tracking-[0.16em] text-text-dim">
                {t("modifierGroups.optionsSection")}
              </p>
              <Button variant="secondary" size="small" onClick={handleAddOption}>
                <Plus className="h-3.5 w-3.5" />
                {t("modifierGroups.addOption")}
              </Button>

              {options.map((opt, i) => (
                <FormField
                  key={i}
                  label={t("modifierGroups.optionNameLabel")}
                  htmlFor={`opt-name-${i}`}
                  className="mt-2"
                >
                  <Input
                    id={`opt-name-${i}`}
                    value={opt.name}
                    onInput={(e) => {
                      const value = e.currentTarget.value;
                      setOptions((prev) =>
                        prev.map((o, j) =>
                          j === i ? { ...o, name: value } : o,
                        ),
                      );
                    }}
                  />
                </FormField>
              ))}
            </div>

            <div className="flex items-center justify-end border-t border-border pt-2.5">
              <Button type="submit" variant="default" size="small">
                {t("modifierGroups.createButton")}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <div data-testid="modifier-assignment-section" className="border-t border-border pt-3">
        <h3 className="text-md mb-2 font-semibold text-text">
          {t("modifierGroups.assignmentSection")}
        </h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                onClick={() => handleCategoryToggle(cat.id)}
              />
              {cat.name}
            </label>
          ))}
          {products.map((prod) => (
            <label key={prod.id} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                onClick={() => handleProductToggle(prod.id)}
              />
              {prod.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export { ModifierGroupSettingsPanel };