import { describe, expect, it } from "vitest";

import type { Category } from "@/features/menu/domain/category";
import type { Product } from "@/features/menu/domain/product";
import { sortProductsForMenu } from "@/features/menu/domain/product-order";

function buildCategory(id: string, name: string): Category {
  return {
    id,
    name,
    description: `${name} description`,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

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

describe("sortProductsForMenu", () => {
  it("orders products by category order and then by product name", () => {
    const categories = [buildCategory("bakery", "Panadería"), buildCategory("coffee", "Café")];
    const products = [
      buildProduct("coffee-latte", "coffee", "Latte"),
      buildProduct("bakery-medialuna", "bakery", "Medialuna"),
      buildProduct("coffee-espresso", "coffee", "Espresso"),
      buildProduct("bakery-tostado", "bakery", "Tostado"),
    ];

    const sorted = sortProductsForMenu(products, categories);

    expect(sorted.map((product) => product.id)).toEqual([
      "bakery-medialuna",
      "bakery-tostado",
      "coffee-espresso",
      "coffee-latte",
    ]);
  });

  it("pushes products with unknown categories to the end", () => {
    const categories = [buildCategory("coffee", "Café")];
    const products = [
      buildProduct("unknown-product", "desserts", "Cheesecake"),
      buildProduct("coffee-product", "coffee", "Latte"),
    ];

    const sorted = sortProductsForMenu(products, categories);

    expect(sorted.map((product) => product.id)).toEqual(["coffee-product", "unknown-product"]);
  });
});
