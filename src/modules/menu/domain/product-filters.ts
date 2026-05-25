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

export function filterProductsByName(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => p.name.toLowerCase().includes(q));
}
