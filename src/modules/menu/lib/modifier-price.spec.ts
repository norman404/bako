import { describe, expect, it } from "bun:test";

import { calculateItemUnitPrice } from "@/modules/menu/lib/modifier-price";
import type { Product } from "@/modules/menu/domain/product";

function buildProduct(price: number): Product {
  return {
    id: "p1",
    categoryId: "c1",
    menuIds: [],
    name: "Capuchino",
    description: "",
    price,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

describe("calculateItemUnitPrice", () => {
  it("returns the product price when modifiers array is empty", () => {
    const product = buildProduct(5000);

    const result = calculateItemUnitPrice(product, []);

    expect(result).toBe(5000);
  });

  it("adds a single modifier surcharge to the product price", () => {
    const product = buildProduct(5000);
    const modifiers = [{ priceDelta: 500 }];

    const result = calculateItemUnitPrice(product, modifiers);

    expect(result).toBe(5500);
  });

  it("sums multiple modifier surcharges into the product price", () => {
    const product = buildProduct(5000);
    const modifiers = [{ priceDelta: 500 }, { priceDelta: 800 }];

    const result = calculateItemUnitPrice(product, modifiers);

    expect(result).toBe(6300);
  });

  it("does not change the price when every modifier has delta zero", () => {
    const product = buildProduct(5000);
    const modifiers = [{ priceDelta: 0 }, { priceDelta: 0 }];

    const result = calculateItemUnitPrice(product, modifiers);

    expect(result).toBe(5000);
  });
});