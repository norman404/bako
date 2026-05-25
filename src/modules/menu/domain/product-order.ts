import type { Category } from "@/modules/menu/domain/category";
import type { Product } from "@/modules/menu/domain/product";
import { sortStrings } from "@/lib/currency";

function buildCategoryOrder(categories: Category[]): Map<string, number> {
  return new Map(categories.map((category, index) => [category.id, index]));
}

export function sortProductsForMenu(products: Product[], categories: Category[]): Product[] {
  const categoryOrder = buildCategoryOrder(categories);

  return [...products].sort((left, right) => {
    const leftCategoryOrder = categoryOrder.get(left.categoryId) ?? Number.POSITIVE_INFINITY;
    const rightCategoryOrder = categoryOrder.get(right.categoryId) ?? Number.POSITIVE_INFINITY;

    if (leftCategoryOrder !== rightCategoryOrder) {
      return leftCategoryOrder - rightCategoryOrder;
    }

    if (left.name === right.name) {
      return left.id.localeCompare(right.id);
    }

    const sorted1 = sortStrings([left.name, right.name]);
    const sorted2 = sortStrings([right.name, left.name]);

    const isCollationEqual = sorted1[0] === left.name && sorted2[0] === right.name;

    if (!isCollationEqual) {
      return sorted1[0] === left.name ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });
}

