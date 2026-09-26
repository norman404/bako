import { describe, expect, it } from "vitest";

import type { Product, SelectedModifier } from "@/modules/menu";
import {
  addItemToCart,
  calculateCartTotals,
  decrementItemQuantity,
  incrementItemQuantity,
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
  costPrice: 100,
  prepTimeMinutes: 1,
  image: "",
  isPopular: false,
  kind: "standard",
  availabilitySchedule: null,
  components: [],
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

const AT_FIRST = new Date(2026, 8, 21, 17, 59).getTime();
const AT_SECOND = new Date(2026, 8, 21, 18, 1).getTime();

describe("cart operations", () => {
  // CASE: The cashier adds the same customized product twice.
  // VALIDATES: Equivalent product and modifier selections share one cart line.
  it("should increase the existing line quantity when product and modifiers match", () => {
    // Arrange
    const items = addItemToCart([], PRODUCT, [LARGE_MODIFIER], "line-1", AT_FIRST);

    // Act
    const result = addItemToCart(items, PRODUCT, [LARGE_MODIFIER], "line-2", AT_SECOND);

    // Assert
    expect(result).toEqual([
      { lineId: "line-1", product: PRODUCT, quantity: 2, selectedModifiers: [LARGE_MODIFIER], unitAddedAt: [AT_FIRST, AT_SECOND] },
    ]);
  });

  // CASE: The cashier adds the same product with a different customization.
  // VALIDATES: Distinct modifier selections remain independently editable cart lines.
  it("should add a separate line when modifier selections differ", () => {
    // Arrange
    const items = addItemToCart([], PRODUCT, [], "line-1", AT_FIRST);

    // Act
    const result = addItemToCart(items, PRODUCT, [LARGE_MODIFIER], "line-2", AT_SECOND);

    // Assert
    expect(result).toHaveLength(2);
  });

  // CASE: The cashier decrements the only unit of a cart line.
  // VALIDATES: A line with zero quantity is removed from the order.
  it("should remove a line when decrementing its final unit", () => {
    // Arrange
    const items: CartItem[] = [
      { lineId: "line-1", product: PRODUCT, quantity: 1, selectedModifiers: [], unitAddedAt: [AT_FIRST] },
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
      { lineId: "line-1", product: PRODUCT, quantity: 1, selectedModifiers: [], unitAddedAt: [AT_FIRST] },
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
      { lineId: "line-1", product: PRODUCT, quantity: 1, selectedModifiers: [], unitAddedAt: [AT_FIRST] },
      { lineId: "line-2", product: PRODUCT, quantity: 1, selectedModifiers: [LARGE_MODIFIER], unitAddedAt: [AT_FIRST] },
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
      { lineId: "line-1", product: PRODUCT, quantity: 2, selectedModifiers: [LARGE_MODIFIER], unitAddedAt: [AT_FIRST, AT_SECOND] },
    ];

    // Act
    const result = calculateCartTotals(items);

    // Assert
    expect(result).toEqual({ itemsCount: 2, total: 800 });
  });

  // CASE: A cashier adds a unit before 18:00 and then removes one after taking another at 18:01.
  // VALIDATES: Each unit keeps its own time and removing a unit drops the most recent one.
  it("should track when each unit was added and drop the newest on decrement", () => {
    // Arrange
    const items = addItemToCart([], PRODUCT, [], "line-1", AT_FIRST);

    // Act
    const incremented = incrementItemQuantity(items, "line-1", AT_SECOND);
    const decremented = decrementItemQuantity(incremented, "line-1");

    // Assert
    expect(incremented[0]).toMatchObject({ quantity: 2, unitAddedAt: [AT_FIRST, AT_SECOND] });
    expect(decremented[0]).toMatchObject({ quantity: 1, unitAddedAt: [AT_FIRST] });
  });
});
