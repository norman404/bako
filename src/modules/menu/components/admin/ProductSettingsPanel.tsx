import { Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

import type { Product } from "@/modules/menu/domain/product";
import type { ProductUpsertInput } from "@/modules/menu/domain/ports";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import {
  useArchiveProduct,
  useCreateProduct,
  useUpdateProduct,
} from "@/modules/menu/hooks/use-products";
import { useMenus } from "@/modules/menu/hooks/use-menus";
import { useCategories } from "@/modules/menu/hooks/use-categories";
import { useProducts } from "@/modules/menu/hooks/use-products";
import {
  formatProductPriceInput,
  parseProductPriceInput,
} from "@/modules/menu/lib/product-price";
import { formatPosCurrency } from "@/lib/currency";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormError } from "@/components/ui/FormError";
import { SearchInput } from "@/components/ui/SearchInput";
import { FormField } from "@/components/ui/FormField";
import { EmptyState } from "@/components/ui/EmptyState";
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

interface ProductFormState {
  categoryId: string;
  menuIds: string[];
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
    menuIds: [],
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
    menuIds: product.menuIds,
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
    menuIds: formState.menuIds,
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
    "w-full cursor-pointer rounded-card border px-2.5 py-2 text-left transition-[border-color,background-color] duration-200",
    isActive
      ? "border-primary bg-primary/10 text-primary-strong"
      : "border-transparent text-text hover:border-border-strong hover:bg-surface-sunken/50",
  ].join(" ");
}

function ProductSettingsPanel() {
  const { flags } = useFeatureFlagsStore();
  const categoriesEnabled = flags.categories_enabled ?? false;
  const multipleMenusEnabled = flags.multiple_menus_enabled ?? false;

  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const { data: menus = [] } = useMenus();

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
      <header className="flex flex-col gap-2.5 border-b border-border-strong pb-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="font-display text-lg text-primary-strong">Productos</h2>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SearchInput
            containerClassName="sm:min-w-[220px]"
            aria-label="Buscar producto"
            value={searchTerm}
            onInput={(event) => setSearchTerm(event.currentTarget.value)}
            placeholder="Buscar"
          />

          <Button
            variant="secondary"
            size="small"
            onClick={beginCreate}
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,0.88fr)_minmax(296px,1.12fr)]">
        <section className="min-h-0 overflow-hidden xl:border-r xl:border-border xl:pr-3">
          <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
            {visibleProducts.map((product) => {
              const isActive = selectedProductId === product.id && mode === PRODUCT_FORM_MODE.EDIT;

              return (
                <div key={product.id} className="flex items-stretch gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => beginEdit(product)}
                    className={getListButtonClass(isActive)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{product.name}</p>
                        <p className="mt-1 line-clamp-1 text-2xs text-text-dim">{product.description}</p>
                      </div>
                      <span className="font-mono-tabular text-2xs text-primary-strong">{formatPosCurrency(product.price)}</span>
                    </div>
                    <p className="mt-1.5 text-2xs uppercase tracking-[0.14em] text-text-dim">{product.prepTimeMinutes} min</p>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (isArchivePending) {
                        return;
                      }
                      void handleArchive(product);
                    }}
                    className="h-auto min-h-[68px] w-8 rounded-card text-text-dim hover:bg-surface-sunken hover:text-danger"
                    aria-label={`Archivar ${product.name}`}
                    disabled={isArchivePending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            {visibleProducts.length === 0 ? (
              <EmptyState>Sin resultados.</EmptyState>
            ) : null}
          </div>
        </section>

        <section className="min-h-0 xl:pl-1">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-md font-semibold text-text">
              {mode === PRODUCT_FORM_MODE.CREATE ? "Nuevo producto" : "Editar producto"}
            </h3>
          </div>

          {!hasCategories ? (
            <div className="mt-3 rounded-card border border-border px-3 py-2">
              <p className="text-xs text-text-muted">Creá una categoría primero.</p>
            </div>
          ) : null}

          <form className="mt-3.5 grid gap-2.5" onSubmit={(event) => void handleSubmit(event)}>
            {multipleMenusEnabled && (
              <FormField label="Menús" htmlFor="product-menus">
                <div className="space-y-2">
                  {menus.map((menu) => (
                    <div key={menu.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`menu-${menu.id}`}
                        checked={formState.menuIds.includes(menu.id)}
                        onCheckedChange={(checked) => {
                          setFormState((previous) => ({
                            ...previous,
                            menuIds: checked
                              ? [...previous.menuIds, menu.id]
                              : previous.menuIds.filter((id) => id !== menu.id),
                          }));
                        }}
                      />
                      <label htmlFor={`menu-${menu.id}`} className="text-xs text-text cursor-pointer">
                        {menu.name}
                      </label>
                    </div>
                  ))}
                </div>
              </FormField>
            )}

            {categoriesEnabled && (
              <FormField label="Categoría" htmlFor="product-category">
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
              </FormField>
            )}

            <FormField label="Nombre" htmlFor="product-name">
              <Input
                id="product-name"
                value={formState.name}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({
                    ...previous,
                    name: value,
                  }));
                }}
                placeholder="Flat white"
              />
            </FormField>

            <FormField label="Descripción" htmlFor="product-description">
              <Input
                id="product-description"
                value={formState.description}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({
                    ...previous,
                    description: value,
                  }));
                }}
                placeholder="Doble shot con leche vaporizada"
              />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Precio" htmlFor="product-price">
                {/* ADR-0001: product prices are integer cents; the input accepts monetary units. */}
                <Input
                  id="product-price"
                  value={formState.price}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((previous) => ({
                      ...previous,
                      price: value.replace(/[^\d,.-]/g, ""),
                    }));
                  }}
                  inputMode="decimal"
                  className="font-mono-tabular"
                  placeholder="55.50"
                />
              </FormField>

              <FormField label="Prep (min)" htmlFor="product-prep-time">
                <Input
                  id="product-prep-time"
                  value={formState.prepTimeMinutes}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((previous) => ({
                      ...previous,
                      prepTimeMinutes: value,
                    }));
                  }}
                  inputMode="numeric"
                  className="font-mono-tabular"
                  placeholder="5"
                />
              </FormField>
            </div>

            <FormField label="Emoji / imagen" htmlFor="product-image">
              <Input
                id="product-image"
                value={formState.image}
                onInput={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((previous) => ({
                    ...previous,
                    image: value,
                  }));
                }}
                placeholder="☕"
              />
            </FormField>

            <div className="flex items-center gap-2">
              <Checkbox
                id="product-popular"
                checked={formState.isPopular}
                onCheckedChange={(checked) =>
                  setFormState((previous) => ({ ...previous, isPopular: checked === true }))
                }
              />
              <label htmlFor="product-popular" className="text-2xs text-text cursor-pointer">
                Popular
              </label>
            </div>

            <FormError message={formError} />

            <div className="flex items-center justify-end border-t border-border pt-2.5">
              <Button
                type="submit"
                variant="default"
                size="small"
                disabled={!hasCategories || isSaving}
              >
                {mode === PRODUCT_FORM_MODE.CREATE ? "Guardar producto" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export { PRODUCT_FORM_MODE, ProductSettingsPanel };
