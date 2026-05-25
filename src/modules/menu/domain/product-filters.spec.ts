import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/menu/domain/product";
import { filterProductsByCategory } from "@/modules/menu/domain/product-filters";

function buildProduct(id: string, categoryId: string, name: string): Product {
  return {
    id,
    categoryId,
    name,
    description: `${name} description`,
    price: 1000,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

describe("filterProductsByCategory", () => {
  it("returns all products when category is all", () => {
    const products = [
      buildProduct("coffee-1", "coffee", "Latte"),
      buildProduct("bakery-1", "bakery", "Medialuna"),
    ];

    expect(filterProductsByCategory(products, "all")).toEqual(products);
  });

  it("returns only products from the selected category", () => {
    const products = [
      buildProduct("coffee-1", "coffee", "Latte"),
      buildProduct("bakery-1", "bakery", "Medialuna"),
      buildProduct("coffee-2", "coffee", "Espresso"),
    ];

    const filtered = filterProductsByCategory(products, "coffee");

    expect(filtered.map((product) => product.id)).toEqual(["coffee-1", "coffee-2"]);
  });
});
