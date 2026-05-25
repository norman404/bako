import type { Product } from "@/modules/menu/domain/product";

export function filterProductsByCategory(
  products: Product[],
  categoryId: string | "all",
): Product[] {
  if (categoryId === "all") {
    return products;
  }
  return products.filter((product) => product.categoryId === categoryId);
}
