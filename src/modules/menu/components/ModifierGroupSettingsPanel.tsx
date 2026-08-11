import { Archive, ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import type { ModifierGroup, ModifierGroupType } from "../modifier-group";
import type { ModifierGroupUpsertInput } from "../ports";
import {
  useArchiveModifierGroup,
  useAssignModifierGroup,
  useCategoryAssignments,
  useCreateModifierGroup,
  useModifierGroups,
  useProductAssignments,
  useReorderModifierGroups,
  useUnassignModifierGroup,
  useUpdateModifierGroup,
} from "../use-modifier-groups";
import { useCategories } from "../use-categories";
import { useProducts } from "../use-products";
import { translateMenuError } from "../lib/translate-menu-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OptionsEditor, type OptionsEditorOption } from "./OptionsEditor";

type FormMode = "create" | "edit";

interface GroupFormState {
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
  firstOptionFree: boolean;
}

function buildEmptyFormState(): GroupFormState {
  return { name: "", type: "single", required: false, sortOrder: 0, firstOptionFree: false };
}

function buildFormStateFromGroup(group: ModifierGroup): GroupFormState {
  return {
    name: group.name,
    type: group.type,
    required: group.required,
    sortOrder: group.sortOrder,
    firstOptionFree: group.firstOptionFree,
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
    firstOptionFree: formState.firstOptionFree,
    options: options.map((opt, i) => ({
      name: opt.name,
      priceDelta: opt.priceDelta,
      isDefault: opt.isDefault,
      sortOrder: i,
    })),
  };
}

function buildGroupUpsertInput(group: ModifierGroup, sortOrder: number): ModifierGroupUpsertInput {
  return {
    name: group.name,
    type: group.type,
    required: group.required,
    sortOrder,
    firstOptionFree: group.firstOptionFree,
    options: group.options.map((option) => ({
      name: option.name,
      priceDelta: option.priceDelta,
      isDefault: option.isDefault,
      sortOrder: option.sortOrder,
    })),
  };
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-none border-l-[3px] px-3 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive
      ? "border-primary-strong bg-primary/15 text-primary-strong"
      : "border-transparent text-text hover:bg-surface-sunken/60",
  ].join(" ");
}

function ModifierGroupSettingsPanel() {
  const { t } = useTranslation(["settings", "errors"]);
  const { data: groups = [] } = useModifierGroups();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const { data: categoryAssignments = new Map() } = useCategoryAssignments();
  const { data: productAssignments = new Map() } = useProductAssignments();
  const createMutation = useCreateModifierGroup();
  const updateMutation = useUpdateModifierGroup();
  const reorderMutation = useReorderModifierGroups();
  const archiveMutation = useArchiveModifierGroup();
  const assignMutation = useAssignModifierGroup();
  const unassignMutation = useUnassignModifierGroup();

  const [mode, setMode] = useState<FormMode>(groups.length === 0 ? "create" : "create");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [formState, setFormState] = useState<GroupFormState>(buildEmptyFormState);
  const [options, setOptions] = useState<OptionsEditorOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ModifierGroup | null>(null);

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
    setArchiveTarget(group);
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      setArchiveTarget(null);
      // If the archived group was being edited, reset the form
      if (selectedGroupId === archiveTarget.id) {
        beginCreate();
      }
    } catch (err) {
      const message = translateMenuError(err, t);
      setFormError(message);
      setArchiveTarget(null);
    }
  };

  const handleMoveGroup = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;

    // Build a new array where the group at `index` is moved to `target`.
    const nextGroups = [...groups];
    const [moved] = nextGroups.splice(index, 1);
    nextGroups.splice(target, 0, moved);

    // Reassign sortOrder based on the new positions. This is necessary
    // because existing groups may all share the same default sortOrder (0),
    // so a simple neighbor swap would not change anything.
    const reordered = nextGroups.map((group, i) => ({
      id: group.id,
      input: buildGroupUpsertInput(group, i),
    }));

    try {
      await reorderMutation.mutateAsync({ groups: reordered });
    } catch (err) {
      setFormError(translateMenuError(err, t));
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
      setFormError(translateMenuError(err, t));
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

  const isSaving = createMutation.isPending || updateMutation.isPending || reorderMutation.isPending || archiveMutation.isPending || assignMutation.isPending || unassignMutation.isPending;
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
            {groups.map((group, index) => {
              const isActive = selectedGroupId === group.id && mode === "edit";
              const isFirst = index === 0;
              const isLast = index === groups.length - 1;
              return (
                <div key={group.id} data-testid={`modifier-group-row-${index}`} className="flex items-stretch gap-1">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveGroup(index, -1)}
                      disabled={isSaving || isFirst}
                      aria-label={t("modifierGroups.moveGroupUp")}
                      className="h-5 w-5 rounded-sharp text-text-dim hover:bg-surface-sunken hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveGroup(index, 1)}
                      disabled={isSaving || isLast}
                      aria-label={t("modifierGroups.moveGroupDown")}
                      className="h-5 w-5 rounded-sharp text-text-dim hover:bg-surface-sunken hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

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
                    variant="danger"
                    size="small"
                    aria-label={t("modifierGroups.archiveButton", { name: group.name })}
                    onClick={() => handleArchive(group)}
                    disabled={isSaving || archiveMutation.isPending}
                    data-testid={`archive-group-${group.id}`}
                    className="h-auto min-h-[60px] gap-1 px-2 text-2xs uppercase tracking-[0.12em]"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {t("modifierGroups.archiveButtonShort", { defaultValue: "Archivar" })}
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
              <Select
                value={formState.type}
                onValueChange={(value) => {
                  setFormState((previous) => ({
                    ...previous,
                    type: value as ModifierGroupType,
                  }));
                }}
              >
                <SelectTrigger id="mod-type" disabled={isSaving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">{t("modifierGroups.typeSingle")}</SelectItem>
                  <SelectItem value="multiple">{t("modifierGroups.typeMultiple")}</SelectItem>
                  <SelectItem value="text">{t("modifierGroups.typeText")}</SelectItem>
                  <SelectItem value="single_text">
                    {t("modifierGroups.typeSingleText")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={t("modifierGroups.requiredLabel")} htmlFor="mod-required">
              <Checkbox
                id="mod-required"
                checked={formState.required}
                onCheckedChange={(checked) => {
                  setFormState((previous) => ({ ...previous, required: checked === true }));
                }}
                disabled={isSaving}
              />
            </FormField>

            {formState.type === "multiple" ? (
              <FormField label={t("modifierGroups.firstOptionFreeLabel")} htmlFor="mod-first-free">
                <Checkbox
                  id="mod-first-free"
                  checked={formState.firstOptionFree}
                  onCheckedChange={(checked) => {
                    setFormState((previous) => ({
                      ...previous,
                      firstOptionFree: checked === true,
                    }));
                  }}
                  disabled={isSaving}
                />
              </FormField>
            ) : null}

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
                    <Label
                      key={cat.id}
                      className="flex items-center gap-2 text-sm font-normal normal-case tracking-normal text-text"
                    >
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => handleCategoryToggle(cat.id)}
                        disabled={isSaving || assignMutation.isPending}
                      />
                      {cat.name}
                    </Label>
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
                    <Label
                      key={prod.id}
                      className="flex items-center gap-2 text-sm font-normal normal-case tracking-normal text-text"
                    >
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => handleProductToggle(prod.id)}
                        disabled={isSaving || assignMutation.isPending}
                      />
                      {prod.name}
                    </Label>
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

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title={t("modifierGroups.archiveDialogTitle", { defaultValue: "Archivar grupo" })}
        description={
          archiveTarget
            ? t("modifierGroups.confirmArchive", { name: archiveTarget.name })
            : ""
        }
        confirmLabel={t("modifierGroups.archiveButtonShort", { defaultValue: "Archivar" })}
        confirmVariant="danger"
        isLoading={archiveMutation.isPending}
        onConfirm={() => void handleConfirmArchive()}
      />
    </div>
  );
}

export { ModifierGroupSettingsPanel };
