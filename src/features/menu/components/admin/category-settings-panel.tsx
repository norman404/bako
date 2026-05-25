import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import type { Category } from "@/features/menu/domain/category";
import type { CategoryCreateInput } from "@/features/menu/domain/ports";
import {
  useArchiveCategory,
  useCreateCategory,
  useUpdateCategory,
} from "@/features/menu/hooks/use-categories";

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
}

function buildEmptyFormState(): CategoryFormState {
  return {
    name: "",
    description: "",
  };
}

function buildFormStateFromCategory(category: Category): CategoryFormState {
  return {
    name: category.name,
    description: category.description,
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
  };
}

const FIELD_INPUT_CLASS = [
  "h-9 w-full rounded-card border border-hairline bg-obsidian px-3",
  "text-[13px] text-ink outline-none",
  "placeholder:text-ink-dim",
  "transition-colors duration-150",
  "focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20",
].join(" ");

const FIELD_LABEL_CLASS = "grid gap-1 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim";
const FIELD_TEXTAREA_CLASS = [
  "w-full min-h-[132px] resize-none rounded-card border border-hairline bg-obsidian px-3 py-3",
  "text-[13px] text-ink outline-none",
  "placeholder:text-ink-dim",
  "transition-colors duration-150",
  "focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20",
].join(" ");

function getListButtonClass(isActive: boolean): string {
  return [
    "w-full rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-150",
    isActive
      ? "border-champagne/24 bg-white/[0.032]"
      : "border-transparent hover:border-hairline hover:bg-white/[0.02]",
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

        <button
          type="button"
          onClick={beginCreate}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-card border border-hairline bg-obsidian px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors duration-150 hover:border-hairline-strong hover:text-champagne"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva
        </button>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.86fr)_minmax(300px,1.14fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-hairline xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {categories.map((category) => {
              const isActive = selectedCategoryId === category.id && mode === CATEGORY_FORM_MODE.EDIT;

              return (
                <div key={category.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => beginEdit(category)}
                    className={getListButtonClass(isActive)}
                  >
                    <p className="text-[12px] font-medium text-ink">{category.name}</p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-ink-dim">{category.description}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isArchivePending) {
                        return;
                      }
                      void handleArchive(category);
                    }}
                    className="flex h-auto min-h-[60px] w-8 shrink-0 items-center justify-center rounded-card text-ink-dim transition-colors duration-150 hover:bg-white/[0.04] hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Archivar ${category.name}`}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            {categories.length === 0 ? (
              <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[12px] text-ink-muted">
                Sin categorías.
              </p>
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
            <label className={FIELD_LABEL_CLASS}>
              Nombre
              <input
                value={formState.name}
                onInput={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    name: event.currentTarget.value,
                  }))
                }
                className={FIELD_INPUT_CLASS}
                placeholder="Bebidas calientes"
              />
            </label>

            <label className={FIELD_LABEL_CLASS}>
              Descripción
              <textarea
                value={formState.description}
                onInput={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    description: event.currentTarget.value,
                  }))
                }
                className={FIELD_TEXTAREA_CLASS}
                placeholder="Espacios del menú para bebidas, comidas y postres"
              />
            </label>

            {formError ? (
              <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
                {formError}
              </p>
            ) : null}

            <div className="flex items-center justify-end border-t border-hairline pt-2.5">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-9 items-center justify-center rounded-card bg-champagne px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-obsidian transition-colors duration-150 hover:bg-champagne/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mode === CATEGORY_FORM_MODE.CREATE ? "Crear categoría" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export { CATEGORY_FORM_MODE, CategorySettingsPanel };
