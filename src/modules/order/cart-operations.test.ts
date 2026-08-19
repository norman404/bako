import { describe, expect, it } from "vitest";

import type { Product, SelectedModifier } from "@/modules/menu";
import {
  addItemToCart,
  calculateCartTotals,
  decrementItemQuantity,
  removeItemFromCart,
  type CartItem,
} from "./cart-operations";

const PRODUCT: Product = {
  id: "coffee",
  categoryId: "drinks",
  menuIds: ["main"],
  name: "Coffee",
  description: "",
  price: 300,
  prepTimeMinutes: 1,
  image: "",
  isPopular: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  deletedAt: null,
};

const LARGE_MODIFIER: SelectedModifier = {
  groupId: "size",
  groupName: "Size",
  optionId: "large",
  optionName: "Large",
  priceDelta: 100,
  textValue: null,
};

describe("cart operations", () => {
  // CASE: The cashier adds the same customized product twice.
  // VALIDATES: Equivalent product and modifier selections share one cart line.
  it("should increase the existing line quantity when product and modifiers match", () => {
    // Arrange
    const items = addItemToCart([], PRODUCT, [LARGE_MODIFIER], "line-1");

    // Act
    const result = addItemToCart(items, PRODUCT, [LARGE_MODIFIER], "line-2");

    // Assert
    expect(result).toEqual([
      { lineId: "line-1", product: PRODUCT, quantity: 2, selectedModifiers: [LARGE_MODIFIER] },
    ]);
  });

  // CASE: The cashier adds the same product with a different customization.
  // VALIDATES: Distinct modifier selections remain independently editable cart lines.
  it("should add a separate line when modifier selections differ", () => {
    // Arrange
    const items = addItemToCart([], PRODUCT, [], "line-1");

    // Act
    const result = addItemToCart(items, PRODUCT, [LARGE_MODIFIER], "line-2");

    // Assert
    expect(result).toHaveLength(2);
  });

  // CASE: The cashier decrements the only unit of a cart line.
  // VALIDATES: A line with zero quantity is removed from the order.
  it("should remove a line when decrementing its final unit", () => {
    // Arrange
    const items: CartItem[] = [
      { lineId: "line-1", product: PRODUCT, quantity: 1, selectedModifiers: [] },
    ];

    // Act
    const result = decrementItemQuantity(items, "line-1");

    // Assert
    expect(result).toEqual([]);
  });

  // CASE: A stale interaction targets a cart line that no longer exists.
  // VALIDATES: Unknown line identifiers do not alter the current order.
  it("should preserve items when decrementing an unknown line", () => {
    // Arrange
    const items: CartItem[] = [
      { lineId: "line-1", product: PRODUCT, quantity: 1, selectedModifiers: [] },
    ];

    // Act
    const result = decrementItemQuantity(items, "missing");

    // Assert
    expect(result).toEqual(items);
  });

  // CASE: The cashier removes one line while another remains in the cart.
  // VALIDATES: Removing a line does not discard unrelated items.
  it("should retain other lines when removing a selected line", () => {
    // Arrange
    const items: CartItem[] = [
      { lineId: "line-1", product: PRODUCT, quantity: 1, selectedModifiers: [] },
      { lineId: "line-2", product: PRODUCT, quantity: 1, selectedModifiers: [LARGE_MODIFIER] },
    ];

    // Act
    const result = removeItemFromCart(items, "line-1");

    // Assert
    expect(result).toEqual([items[1]]);
  });

  // CASE: The cart contains customized items with multiple quantities.
  // VALIDATES: Totals include each modifier surcharge and line quantity.
  it("should include modifier surcharges for every item quantity", () => {
    // Arrange
    const items: CartItem[] = [
      { lineId: "line-1", product: PRODUCT, quantity: 2, selectedModifiers: [LARGE_MODIFIER] },
    ];

    // Act
    const result = calculateCartTotals(items);

    // Assert
    expect(result).toEqual({ itemsCount: 2, total: 800 });
  });
});
