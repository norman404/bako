import { Plus, Search, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import type { Category } from "@/modules/menu/domain/category";
import type { Product } from "@/modules/menu/domain/product";
import type { ProductUpsertInput } from "@/modules/menu/domain/ports";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import {
  useArchiveProduct,
  useCreateProduct,
  useUpdateProduct,
} from "@/modules/menu/hooks/use-products";
import {
  formatProductPriceInput,
  parseProductPriceInput,
} from "@/modules/menu/lib/product-price";
import { formatPosCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/FormError";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const PRODUCT_FORM_MODE = {
  CREATE: "create",
  EDIT: "edit",
} as const;

type ProductFormMode = (typeof PRODUCT_FORM_MODE)[keyof typeof PRODUCT_FORM_MODE];

interface ProductSettingsPanelProps {
  categories: Category[];
  products: Product[];
  onManageCategories: () => void;
}

interface ProductFormState {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  prepTimeMinutes: string;
  image: string;
  isPopular: boolean;
}

function buildEmptyFormState(defaultCategoryId: string): ProductFormState {
  return {
    categoryId: defaultCategoryId,
    name: "",
    description: "",
    price: "",
    prepTimeMinutes: "0",
    image: "☕",
    isPopular: false,
  };
}

function buildFormStateFromProduct(product: Product): ProductFormState {
  return {
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    price: formatProductPriceInput(product.price),
    prepTimeMinutes: String(product.prepTimeMinutes),
    image: product.image,
    isPopular: product.isPopular,
  };
}

function toProductPayload(
  formState: ProductFormState,
  defaultCategoryId: string,
): ProductUpsertInput | null {
  const categoryId = formState.categoryId.trim() || defaultCategoryId.trim();
  const name = formState.name.trim();
  const description = formState.description.trim();
  const image = formState.image.trim();
  const price = parseProductPriceInput(formState.price);
  const prepTimeMinutes = Number.parseInt(formState.prepTimeMinutes, 10);

  if (categoryId.length === 0 || name.length === 0 || description.length === 0 || image.length === 0) {
    return null;
  }

  if (price === null) {
    return null;
  }

  if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 0) {
    return null;
  }

  return {
    categoryId,
    name,
    description,
    price,
    prepTimeMinutes,
    image,
    isPopular: formState.isPopular,
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

function ProductSettingsPanel({ categories, products, onManageCategories }: ProductSettingsPanelProps) {
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const archiveProductMutation = useArchiveProduct();

  const orderedProducts = sortProductsForMenu(products, categories);
  const defaultCategoryId = categories[0]?.id ?? "";
  const initialProduct = orderedProducts[0] ?? null;

  const [mode, setMode] = useState<ProductFormMode>(
    initialProduct ? PRODUCT_FORM_MODE.EDIT : PRODUCT_FORM_MODE.CREATE,
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialProduct?.id ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formState, setFormState] = useState<ProductFormState>(() =>
    initialProduct ? buildFormStateFromProduct(initialProduct) : buildEmptyFormState(defaultCategoryId),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const hasCategories = categories.length > 0;
  const isSaving = createProductMutation.isPending || updateProductMutation.isPending;
  const isArchivePending = archiveProductMutation.isPending;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleProducts = orderedProducts.filter((product) => {
    if (normalizedSearch.length === 0) {
      return true;
    }

    return `${product.name} ${product.description}`.toLowerCase().includes(normalizedSearch);
  });

  const beginCreate = () => {
    setMode(PRODUCT_FORM_MODE.CREATE);
    setSelectedProductId(null);
    setFormError(null);
    setFormState(buildEmptyFormState(defaultCategoryId));
  };

  const beginEdit = (product: Product) => {
    setMode(PRODUCT_FORM_MODE.EDIT);
    setSelectedProductId(product.id);
    setFormError(null);
    setFormState(buildFormStateFromProduct(product));
  };

  const handleArchive = async (product: Product) => {
    const shouldArchive = window.confirm(`¿Archivar ${product.name}? El producto dejará de mostrarse en caja.`);
    if (!shouldArchive) {
      return;
    }

    try {
      await archiveProductMutation.mutateAsync(product.id);
      if (selectedProductId === product.id) {
        beginCreate();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo archivar el producto");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasCategories) {
      setFormError("Creá una categoría primero.");
      return;
    }

    const payload = toProductPayload(formState, defaultCategoryId);
    if (!payload) {
      setFormError("Revisá los campos.");
      return;
    }

    try {
      if (mode === PRODUCT_FORM_MODE.CREATE) {
        await createProductMutation.mutateAsync(payload);
      } else if (selectedProductId) {
        await updateProductMutation.mutateAsync({ id: selectedProductId, input: payload });
      }

      beginCreate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el producto");
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex flex-col gap-2.5 border-b border-hairline pb-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Productos</h2>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="relative block sm:min-w-[220px]">
            <span className="sr-only">Buscar producto</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-dim" />
            <Input
              aria-label="Buscar producto"
              value={searchTerm}
              onInput={(event) => setSearchTerm(event.currentTarget.value)}
              className="pl-9"
              placeholder="Buscar"
            />
          </label>

          <button
            type="button"
            onClick={beginCreate}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-card border border-hairline bg-obsidian px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors duration-150 hover:border-hairline-strong hover:text-champagne"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </button>
        </div>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.88fr)_minmax(296px,1.12fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-hairline xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {visibleProducts.map((product) => {
              const isActive = selectedProductId === product.id && mode === PRODUCT_FORM_MODE.EDIT;

              return (
                <div key={product.id} className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => beginEdit(product)}
                    className={getListButtonClass(isActive)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-ink">{product.name}</p>
                        <p className="mt-1 line-clamp-1 text-[10px] text-ink-dim">{product.description}</p>
                      </div>
                      <span className="font-mono-tabular text-[10px] text-champagne">{formatPosCurrency(product.price)}</span>
                    </div>
                    <p className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-dim">{product.prepTimeMinutes} min</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isArchivePending) {
                        return;
                      }
                      void handleArchive(product);
                    }}
                    className="flex h-auto min-h-[68px] w-8 shrink-0 items-center justify-center rounded-card text-ink-dim transition-colors duration-150 hover:bg-surface-mid hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Archivar ${product.name}`}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            {visibleProducts.length === 0 ? (
              <p className="rounded-card border border-dashed border-hairline px-4 py-8 text-center text-[12px] text-ink-muted">
                Sin resultados.
              </p>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-hairline pb-2.5">
            <h3 className="text-[16px] font-medium tracking-[-0.02em] text-ink">
              {mode === PRODUCT_FORM_MODE.CREATE ? "Nuevo producto" : "Editar producto"}
            </h3>
          </div>

          {!hasCategories ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-card border border-hairline px-3 py-2">
              <p className="text-[12px] text-ink-muted">Creá una categoría primero.</p>
              <button
                type="button"
                onClick={onManageCategories}
                className="inline-flex h-8 items-center rounded-card border border-hairline px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors duration-150 hover:border-hairline-strong hover:text-champagne"
              >
                Categorías
              </button>
            </div>
          ) : null}

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid gap-1">
              <Label htmlFor="product-category">Categoría</Label>
              <Select
                value={formState.categoryId || defaultCategoryId}
                onValueChange={(value) =>
                  setFormState((previous) => ({ ...previous, categoryId: value }))
                }
              >
                <SelectTrigger id="product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="product-name">Nombre</Label>
              <Input
                id="product-name"
                value={formState.name}
                onInput={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    name: event.currentTarget.value,
                  }))
                }
                placeholder="Flat white"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="product-description">Descripción</Label>
              <Input
                id="product-description"
                value={formState.description}
                onInput={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    description: event.currentTarget.value,
                  }))
                }
                placeholder="Doble shot con leche vaporizada"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label htmlFor="product-price">Precio</Label>
                <Input
                  id="product-price"
                  value={formState.price}
                  onInput={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      price: event.currentTarget.value.replace(/[^\d,.-]/g, ""),
                    }))
                  }
                  inputMode="decimal"
                  className="font-mono-tabular"
                  placeholder="55.50"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="product-prep-time">Prep (min)</Label>
                <Input
                  id="product-prep-time"
                  value={formState.prepTimeMinutes}
                  onInput={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      prepTimeMinutes: event.currentTarget.value,
                    }))
                  }
                  inputMode="numeric"
                  className="font-mono-tabular"
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="product-image">Emoji / imagen</Label>
              <Input
                id="product-image"
                value={formState.image}
                onInput={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    image: event.currentTarget.value,
                  }))
                }
                placeholder="☕"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="product-popular"
                checked={formState.isPopular}
                onCheckedChange={(checked) =>
                  setFormState((previous) => ({ ...previous, isPopular: checked === true }))
                }
              />
              <label htmlFor="product-popular" className="text-[11px] text-ink cursor-pointer">
                Popular
              </label>
            </div>

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-hairline pt-2.5">
              <button
                type="submit"
                disabled={!hasCategories || isSaving}
                className="inline-flex h-9 items-center justify-center rounded-card bg-champagne px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-obsidian transition-colors duration-150 hover:bg-champagne/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {mode === PRODUCT_FORM_MODE.CREATE ? "Guardar producto" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export { PRODUCT_FORM_MODE, ProductSettingsPanel };
