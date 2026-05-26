import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import type { Category } from "@/modules/menu/domain/category";
import type { CategoryCreateInput } from "@/modules/menu/domain/ports";
import {
  useArchiveCategory,
  useCreateCategory,
  useUpdateCategory,
} from "@/modules/menu/hooks/use-categories";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/ui/FormError";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";

const CATEGORY_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type CategoryFormMode = (typeof CATEGORY_FORM_MODE)[keyof typeof CATEGORY_FORM_MODE];

interface CategorySettingsPanelProps {
  categories: Category[];
}

interface CategoryFormState {
  name: string;
  description: string;
  color: string;
}

function buildEmptyFormState(): CategoryFormState {
  return {
    name: "",
    description: "",
    color: "",
  };
}

function buildFormStateFromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    description: category.description,
    color: category.color ?? "",
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
  };
}

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive
      ? "border-champagne/24 bg-surface-mid"
      : "border-transparent hover:border-hairline hover:bg-surface-low",
  ].join(" ");
}

function CategorySettingsPanel({ categories }: CategorySettingsPanelProps) {
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

  const handleArchive = async (category: Category) => {
    const shouldArchive = window.confirm(
      `¿Archivar ${category.name}? Solo se puede hacer si no tiene productos activos.`,
    );
    if (!shouldArchive) {
      return;
    }

    try {
      await archiveCategoryMutation.mutateAsync(category.id);
      if (selectedCategoryId === category.id) {
        beginCreate();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo archivar la categoría");
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
      setFormError(error instanceof Error ? error.message : "No se pudo guardar la categoría");
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Categorías</h2>

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
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-hairline xl:pr-3">
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
                    <p className="text-[12px] font-medium text-ink">{category.name}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-ink-dim">{category.description}</p>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isArchivePending) {
                        return;
                      }
                      void handleArchive(category);
                    }}
                    className="h-auto min-h-[60px] w-8 rounded-card text-ink-dim hover:bg-surface-mid hover:text-danger"
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
          <div className="border-b border-hairline pb-2.5">
            <h3 className="text-[16px] font-medium tracking-[-0.02em] text-ink">
              {mode === CATEGORY_FORM_MODE.CREATE ? "Nueva categoría" : "Editar categoría"}
            </h3>
          </div>

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
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

            <FormField label="Color (hex opcional)" htmlFor="category-color">
              <Input
                id="category-color"
                value={formState.color}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({ ...previous, color: value }));
                }}
                placeholder="#C8E6C9"
              />
            </FormField>

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-hairline pt-2.5">
              <Button
                type="submit"
                variant="default"
                size="small"
                className="rounded-card bg-champagne text-obsidian hover:bg-champagne/90"
                disabled={isSaving}
              >
                {mode === CATEGORY_FORM_MODE.CREATE ? "Crear categoría" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export { CATEGORY_FORM_MODE, CategorySettingsPanel };
