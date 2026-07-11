import { Archive, Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import type { ModifierGroup, ModifierGroupType } from "@/modules/menu/domain/modifier-group";
import {
  useArchiveModifierGroup,
  useAssignModifierGroup,
  useCategoryAssignments,
  useCreateModifierGroup,
  useModifierGroups,
  useProductAssignments,
  useUnassignModifierGroup,
  useUpdateModifierGroup,
} from "@/modules/menu/hooks/use-modifier-groups";
import { useCategories } from "@/modules/menu/hooks/use-categories";
import { useProducts } from "@/modules/menu/hooks/use-products";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { OptionsEditor, type OptionsEditorOption } from "@/modules/menu/components/admin/OptionsEditor";

type FormMode = "create" | "edit";

interface GroupFormState {
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
}

function buildEmptyFormState(): GroupFormState {
  return { name: "", type: "single", required: false, sortOrder: 0 };
}

function buildFormStateFromGroup(group: ModifierGroup): GroupFormState {
  return {
    name: group.name,
    type: group.type,
    required: group.required,
    sortOrder: group.sortOrder,
  };
}

function toGroupPayload(formState: GroupFormState, options: OptionsEditorOption[]) {
  const name = formState.name.trim();
  if (name.length === 0) return null;
  return {
    name,
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
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-200",
    isActive
      ? "border-primary bg-primary/10 text-primary-strong"
      : "border-transparent text-text hover:border-border-strong hover:bg-surface-sunken/50",
  ].join(" ");
}

function ModifierGroupSettingsPanel() {
  const { t } = useTranslation("settings");
  const { data: groups = [] } = useModifierGroups();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const { data: categoryAssignments = new Map() } = useCategoryAssignments();
  const { data: productAssignments = new Map() } = useProductAssignments();
  const createMutation = useCreateModifierGroup();
  const updateMutation = useUpdateModifierGroup();
  const archiveMutation = useArchiveModifierGroup();
  const assignMutation = useAssignModifierGroup();
  const unassignMutation = useUnassignModifierGroup();

  const [mode, setMode] = useState<FormMode>(groups.length === 0 ? "create" : "create");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GroupFormState>(buildEmptyFormState);
  const [options, setOptions] = useState<OptionsEditorOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const beginCreate = () => {
    setMode("create");
    setSelectedGroupId(null);
    setFormError(null);
    setFormState(buildEmptyFormState());
    setOptions([]);
  };

  const beginEdit = (group: ModifierGroup) => {
    setMode("edit");
    setSelectedGroupId(group.id);
    setFormError(null);
    setFormState(buildFormStateFromGroup(group));
    setOptions(
      group.options.map((o) => ({
        name: o.name,
        priceDelta: o.priceDelta,
        isDefault: o.isDefault,
        sortOrder: o.sortOrder,
      })),
    );
  };

  const handleArchive = (group: ModifierGroup) => {
    const shouldArchive = window.confirm(
      t("modifierGroups.confirmArchive", { name: group.name }),
    );
    if (!shouldArchive) return;
    const promise = archiveMutation.mutateAsync(group.id);
    if (promise && typeof promise.catch === "function") {
      promise.catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : t("modifierGroups.archiveError"));
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const payload = toGroupPayload(formState, options);
    if (!payload) {
      setFormError(t("modifierGroups.nameRequired"));
      return;
    }

    if (options.length === 0) {
      setFormError(t("modifierGroups.optionsRequired"));
      return;
    }

    try {
      if (mode === "edit" && selectedGroupId) {
        await updateMutation.mutateAsync({ id: selectedGroupId, input: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      beginCreate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("modifierGroups.error"));
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (!selectedGroupId) return;
    const isAssigned = categoryAssignments.get(categoryId)?.has(selectedGroupId) ?? false;
    const mutation = isAssigned ? unassignMutation : assignMutation;
    const promise = mutation.mutateAsync({ groupId: selectedGroupId, categoryId });
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => undefined);
    }
  };

  const handleProductToggle = (productId: string) => {
    if (!selectedGroupId) return;
    const isAssigned = productAssignments.get(productId)?.has(selectedGroupId) ?? false;
    const mutation = isAssigned ? unassignMutation : assignMutation;
    const promise = mutation.mutateAsync({ groupId: selectedGroupId, productId });
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => undefined);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isFormValid = formState.name.trim().length > 0 && options.length > 0;

  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">
          {t("modifierGroups.title")}
        </h2>
        <Button
          variant="secondary"
          size="small"
          onClick={beginCreate}
          disabled={isSaving}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("modifierGroups.newButton")}
        </Button>
      </header>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {groups.map((group) => {
              const isActive = selectedGroupId === group.id && mode === "edit";
              return (
                <div key={group.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(group)}
                    className={getListButtonClass(isActive)}
                    disabled={isSaving}
                  >
                    <p className="text-xs font-medium">{group.name}</p>
                    <p className="mt-1 line-clamp-1 text-2xs text-text-dim">
                      {t(`modifierGroups.type${group.type[0].toUpperCase()}${group.type.slice(1)}` as `modifierGroups.type${Capitalize<ModifierGroupType>}`)}
                    </p>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("modifierGroups.archiveButton", { name: group.name })}
                    onClick={() => handleArchive(group)}
                    disabled={isSaving}
                    className="h-auto min-h-[60px] w-8 text-text-dim hover:bg-surface-sunken hover:text-danger"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {groups.length === 0 ? (
              <p className="text-xs text-text-dim">{t("modifierGroups.emptyState")}</p>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {mode === "create"
                ? t("modifierGroups.newGroup")
                : t("modifierGroups.editGroup")}
            </h3>
          </div>

          <form
            data-testid="modifier-group-form"
            className="mt-3.5 grid gap-2.5"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <FormField label={t("modifierGroups.nameLabel")} htmlFor="mod-name">
              <Input
                id="mod-name"
                value={formState.name}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  setFormState((p) => ({ ...p, name: value }));
                }}
                placeholder={t("modifierGroups.namePlaceholder")}
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </FormField>

            <OptionsEditor
              options={options}
              onChange={setOptions}
              groupKind={formState.type}
              disabled={isSaving}
            />

            <FormError message={formError} />

            <div className="flex items-center justify-end gap-2 border-t border-border pt-2.5">
              <Button
                type="submit"
                variant="default"
                size="small"
                disabled={!isFormValid || isSaving}
              >
                {mode === "create"
                  ? t("modifierGroups.createButton")
                  : t("modifierGroups.saveButton")}
              </Button>
            </div>
          </form>
        </section>
      </div>

      {selectedGroup ? (
        <div
          data-testid="modifier-assignment-section"
          className="border-t border-border pt-3"
        >
          <h3 className="text-md mb-2 font-semibold text-text">
            {t("modifierGroups.assignmentSection")}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-1.5">{t("modifierGroups.assignToCategory")}</p>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const isAssigned = categoryAssignments.get(cat.id)?.has(selectedGroup.id) ?? false;
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleCategoryToggle(cat.id)}
                        disabled={isSaving || assignMutation.isPending}
                      />
                      {cat.name}
                    </label>
                  );
                })}
                {categories.length === 0 ? (
                  <p className="text-2xs text-text-dim">—</p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="eyebrow mb-1.5">{t("modifierGroups.assignToProduct")}</p>
              <div className="space-y-1">
                {products.map((prod) => {
                  const isAssigned = productAssignments.get(prod.id)?.has(selectedGroup.id) ?? false;
                  return (
                    <label
                      key={prod.id}
                      className="flex items-center gap-2 text-sm text-text"
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleProductToggle(prod.id)}
                        disabled={isSaving || assignMutation.isPending}
                      />
                      {prod.name}
                    </label>
                  );
                })}
                {products.length === 0 ? (
                  <p className="text-2xs text-text-dim">—</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { ModifierGroupSettingsPanel };
