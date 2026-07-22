import { describe, expect, it } from "bun:test";

import { filterProductsByCategory } from "@/modules/menu/domain/product-filters";
import { buildProduct } from "@/modules/menu/test/factories";

describe("filterProductsByCategory", () => {
  it("returns all products when category is all", () => {
    const products = [
      buildProduct({ id: "coffee-1", categoryId: "coffee", name: "Latte" }),
      buildProduct({ id: "bakery-1", categoryId: "bakery", name: "Medialuna" }),
    ];

    expect(filterProductsByCategory(products, "all")).toEqual(products);
  });

  it("returns only products from the selected category", () => {
    const products = [
      buildProduct({ id: "coffee-1", categoryId: "coffee", name: "Latte" }),
      buildProduct({ id: "bakery-1", categoryId: "bakery", name: "Medialuna" }),
      buildProduct({ id: "coffee-2", categoryId: "coffee", name: "Espresso" }),
    ];

    const filtered = filterProductsByCategory(products, "coffee");

    expect(filtered.map((product) => product.id)).toEqual(["coffee-1", "coffee-2"]);
  });
});
