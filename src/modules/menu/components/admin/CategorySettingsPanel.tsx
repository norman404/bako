import { ColorInput } from "@/shared/components/ColorInput";
import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Category } from "@/modules/menu/domain/category";
import type { CategoryCreateInput } from "@/modules/menu/domain/ports";
import {
  useArchiveCategory,
  useCreateCategory,
  useUpdateCategory,
} from "@/modules/menu/hooks/use-categories";
import { useCategories } from "@/modules/menu/hooks/use-categories";
import { useMenus } from "@/modules/menu/hooks/use-menus";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { usePrinters } from "@/modules/printer/hooks/use-printers";
import { translateMenuError } from "@/modules/menu/lib/translate-menu-error";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type CategoryFormMode = (typeof CATEGORY_FORM_MODE)[keyof typeof CATEGORY_FORM_MODE];

interface CategoryFormState {
  name: string;
  description: string;
  color: string;
  menuId: string;
  printerId: string;
}

function buildEmptyFormState(): CategoryFormState {
  return {
    name: "",
    description: "",
    color: "",
    menuId: "",
    printerId: "",
  };
}

function buildFormStateFromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    description: category.description,
    color: category.color ?? "",
    menuId: category.menuId ?? "",
    printerId: category.printerId ?? "",
  };
}

function toCategoryPayload(formState: CategoryFormState): CategoryCreateInput | null {
  const name = formState.name.trim();
  const description = formState.description.trim();

  if (name.length === 0 || description.length === 0) {
    return null;
  }

  return {
    name,
    description,
    color: formState.color.trim() || null,
    menuId: formState.menuId.trim() || null,
    printerId: formState.printerId.trim() || null,
  };
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full cursor-pointer rounded-none border-l-2 px-3 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive
      ? "border-primary bg-primary/10 text-primary-strong"
      : "border-transparent text-text hover:bg-surface-sunken",
  ].join(" ");
}

function CategorySettingsPanel() {
  const { flags } = useFeatureFlagsStore();
  const multipleMenusEnabled = flags.multiple_menus_enabled ?? false;
  const comandasEnabled = flags.comandas_enabled ?? false;
  const { t } = useTranslation(["settings", "errors"]);
  const { data: categories = [] } = useCategories();
  const { data: menus = [] } = useMenus();
  const { data: printers = [] } = usePrinters();

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const archiveCategoryMutation = useArchiveCategory();

  const initialCategory = categories[0] ?? null;
  const [mode, setMode] = useState<CategoryFormMode>(
    initialCategory ? CATEGORY_FORM_MODE.EDIT : CATEGORY_FORM_MODE.CREATE,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategory?.id ?? null);
  const [formState, setFormState] = useState<CategoryFormState>(() =>
    initialCategory ? buildFormStateFromCategory(initialCategory) : buildEmptyFormState(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);

  const isSaving = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isArchivePending = archiveCategoryMutation.isPending;

  const beginCreate = () => {
    setMode(CATEGORY_FORM_MODE.CREATE);
    setSelectedCategoryId(null);
    setFormError(null);
    setFormState(buildEmptyFormState());
  };

  const beginEdit = (category: Category) => {
    setMode(CATEGORY_FORM_MODE.EDIT);
    setSelectedCategoryId(category.id);
    setFormError(null);
    setFormState(buildFormStateFromCategory(category));
  };

  const handleArchive = (category: Category) => {
    setArchiveTarget(category);
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveCategoryMutation.mutateAsync(archiveTarget.id);
      if (selectedCategoryId === archiveTarget.id) {
        beginCreate();
      }
      setArchiveTarget(null);
    } catch (error) {
      setFormError(translateMenuError(error, t));
      setArchiveTarget(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toCategoryPayload(formState);
    if (!payload) {
      setFormError("Completá nombre y descripción.");
      return;
    }

    if (mode === CATEGORY_FORM_MODE.EDIT && !selectedCategoryId) {
      setFormError("Seleccioná una categoría.");
      return;
    }

    try {
      if (mode === CATEGORY_FORM_MODE.CREATE) {
        await createCategoryMutation.mutateAsync(payload);
      } else if (selectedCategoryId) {
        await updateCategoryMutation.mutateAsync({ id: selectedCategoryId, input: payload });
      }

      beginCreate();
    } catch (error) {
      setFormError(translateMenuError(error, t));
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-border-strong pb-3">
        <h2 className="font-display text-lg text-primary-strong">Categorías</h2>

        <Button
          variant="secondary"
          size="small"
          onClick={beginCreate}
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </Button>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {categories.map((category) => {
              const isActive = selectedCategoryId === category.id && mode === CATEGORY_FORM_MODE.EDIT;

              return (
                <div key={category.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(category)}
                    className={getListButtonClass(isActive)}
                  >
                    <p className="text-xs font-medium">{category.name}</p>
                    <p className="mt-1 line-clamp-1 text-2xs text-text-dim">{category.description}</p>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isArchivePending) {
                        return;
                      }
                      handleArchive(category);
                    }}
                    className="h-auto min-h-[60px] w-8 rounded-card text-text-dim hover:bg-surface-sunken hover:text-danger"
                    aria-label={`Archivar ${category.name}`}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {categories.length === 0 ? (
              <EmptyState>Sin categorías.</EmptyState>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {mode === CATEGORY_FORM_MODE.CREATE ? "Nueva categoría" : "Editar categoría"}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            {multipleMenusEnabled && (
              <FormField label="Menú" htmlFor="category-menu">
                <Select
                  value={formState.menuId}
                  onValueChange={(value) =>
                    setFormState((previous) => ({ ...previous, menuId: value }))
                  }
                >
                  <SelectTrigger id="category-menu">
                    <SelectValue placeholder="Seleccionar menú" />
                  </SelectTrigger>
                  <SelectContent>
                    {menus.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            <FormField label="Nombre" htmlFor="category-name">
              <Input
                id="category-name"
                value={formState.name}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, name: value }));
                }}
                placeholder="Bebidas calientes"
              />
            </FormField>

            <FormField label="Descripción" htmlFor="category-description">
              <Textarea
                id="category-description"
                value={formState.description}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, description: value }));
                }}
                className="min-h-[80px]"
                placeholder="Espacios del menú para bebidas, comidas y postres"
              />
            </FormField>

            <ColorInput
              id="category-color"
              value={formState.color}
              onChange={(value) =>
                setFormState((previous) => ({ ...previous, color: value }))
              }
              label="Color (hex opcional)"
              placeholder="#C8E6C9"
            />

            {comandasEnabled && (
              <FormField label="Impresora de comanda" htmlFor="category-printer">
                <Select
                  value={formState.printerId}
                  onValueChange={(value) =>
                    setFormState((previous) => ({ ...previous, printerId: value }))
                  }
                >
                  <SelectTrigger id="category-printer">
                    <SelectValue placeholder="Sin impresora asignada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin impresora asignada</SelectItem>
                    {printers.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        {printer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-border pt-2.5">
              <Button
                type="submit"
                variant="default"
                size="small"
                disabled={isSaving}
              >
                {mode === CATEGORY_FORM_MODE.CREATE ? "Crear categoría" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
        title="Archivar categoría"
        description={
          archiveTarget
            ? `¿Archivar ${archiveTarget.name}? Solo se puede hacer si no tiene productos activos.`
            : ""
        }
        confirmLabel="Archivar"
        confirmVariant="danger"
        isLoading={isArchivePending}
        onConfirm={() => void handleConfirmArchive()}
      />
    </div>
  );
}

export { CATEGORY_FORM_MODE, CategorySettingsPanel };
