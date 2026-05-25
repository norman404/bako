import type { Product } from "@/features/menu/domain/product";

export function filterProductsByCategory(
  products: Product[],
  categoryId: string | "all",
): Product[] {
  if (categoryId === "all") {
    return products;
  }
  return products.filter((product) => product.categoryId === categoryId);
}
