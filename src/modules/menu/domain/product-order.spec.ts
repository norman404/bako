import { describe, expect, it } from "bun:test";

import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import { buildCategory, buildProduct } from "@/modules/menu/test/factories";

describe("sortProductsForMenu", () => {
  it("orders products by category order and then by product name", () => {
    const categories = [
      buildCategory({ id: "bakery", name: "Panadería" }),
      buildCategory({ id: "coffee", name: "Café" }),
    ];
    const products = [
      buildProduct({ id: "coffee-latte", categoryId: "coffee", name: "Latte" }),
      buildProduct({ id: "bakery-medialuna", categoryId: "bakery", name: "Medialuna" }),
      buildProduct({ id: "coffee-espresso", categoryId: "coffee", name: "Espresso" }),
      buildProduct({ id: "bakery-tostado", categoryId: "bakery", name: "Tostado" }),
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
    const categories = [buildCategory({ id: "coffee", name: "Café" })];
    const products = [
      buildProduct({ id: "unknown-product", categoryId: "desserts", name: "Cheesecake" }),
      buildProduct({ id: "coffee-product", categoryId: "coffee", name: "Latte" }),
    ];

    const sorted = sortProductsForMenu(products, categories);

    expect(sorted.map((product) => product.id)).toEqual(["coffee-product", "unknown-product"]);
  });
});
