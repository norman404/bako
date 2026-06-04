import { useCategories } from "@/modules/menu/hooks/use-categories";
import { useProducts } from "@/modules/menu/hooks/use-products";
import { filterProductsByCategory, filterProductsByName } from "@/modules/menu/domain/product-filters";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import { useMenuStore } from "@/modules/menu/store/menu-store";
import { POS_CATEGORY_FILTER, usePosStore } from "@/shared/stores/pos-store";

interface UseFilteredProductsOptions {
  menuId?: string | null;
  categoriesEnabled?: boolean;
}

/**
 * Encapsula toda la lógica de filtrado y ordenamiento de productos del POS.
 *
 * Regla de búsqueda: cuando hay productSearch activo, el filtro por categoría
 * se ignora automáticamente (equivale a "all"), sin necesidad de acoplar stores.
 */
export function useFilteredProducts({
  menuId,
  categoriesEnabled = false,
}: UseFilteredProductsOptions = {}) {
  const productSearch = useMenuStore((state) => state.productSearch);
  const selectedCategory = usePosStore((state) => state.selectedCategory);

  const { data: products = [], isLoading: isProductsLoading } = useProducts(
    menuId ? [menuId] : undefined
  );
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories(
    menuId ?? undefined
  );

  const orderedProducts = sortProductsForMenu(products, categories);

  // Cuando hay búsqueda activa, ignorar el filtro de categoría
  const effectiveCategoryId =
    productSearch.trim().length > 0 ? POS_CATEGORY_FILTER.ALL : selectedCategory;

  const categoryFilteredProducts =
    categoriesEnabled
      ? filterProductsByCategory(orderedProducts, effectiveCategoryId)
      : orderedProducts;

  const visibleProducts = filterProductsByName(categoryFilteredProducts, productSearch);

  const productCountByCategory: Record<string, number> = {};
  for (const product of products) {
    productCountByCategory[product.categoryId] =
      (productCountByCategory[product.categoryId] ?? 0) + 1;
  }

  return {
    products,
    categories,
    visibleProducts,
    productCountByCategory,
    isLoading: isProductsLoading || isCategoriesLoading,
  };
}
