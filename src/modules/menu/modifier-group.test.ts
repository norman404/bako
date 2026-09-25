import { describe, expect, it } from "vitest";

import { calculateItemUnitPrice } from "./lib/modifier-price";
import {
  applyFirstOptionFree,
  buildCartItemKey,
  collapseModifiersForPrint,
  groupRepeatedModifiers,
  type ModifierGroup,
  type SelectedModifier,
} from "./modifier-group";
import type { Product } from "./product";

const PRODUCT: Product = {
  id: "frappe",
  categoryId: "drinks",
  menuIds: [],
  name: "Frappé",
  description: "",
  price: 7_000,
  costPrice: 0,
  prepTimeMinutes: 0,
  image: "",
  isPopular: false,
  kind: "standard",
  availabilitySchedule: null,
  components: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: null,
};

const TOPPINGS: ModifierGroup = {
  id: "toppings",
  name: "Toppings",
  type: "multiple",
  required: false,
  sortOrder: 0,
  firstOptionFree: true,
  allowRepeat: true,
  maxRepeat: 3,
  options: [
    { id: "oreo", groupId: "toppings", name: "Oreo", priceDelta: 1_000, isDefault: false, sortOrder: 0, createdAt: new Date(0), updatedAt: new Date(0), deletedAt: null },
    { id: "nuez", groupId: "toppings", name: "Nuez", priceDelta: 1_500, isDefault: false, sortOrder: 1, createdAt: new Date(0), updatedAt: new Date(0), deletedAt: null },
  ],
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: null,
};

function pick(optionId: string): SelectedModifier {
  const option = TOPPINGS.options.find((current) => current.id === optionId);
  if (!option) throw new Error(optionId);
  return { groupId: TOPPINGS.id, groupName: TOPPINGS.name, optionId, optionName: option.name, priceDelta: option.priceDelta, textValue: null };
}

describe("repeated modifier options", () => {
  // CASE: The first topping is free and the customer asks for a second Oreo.
  // VALIDATES: Only one unit is free; the extra Oreo is charged.
  it("should charge a repeated option after the free one", () => {
    // Arrange
    const selected = [pick("oreo"), pick("oreo")];

    // Act
    const priced = applyFirstOptionFree(TOPPINGS, selected);

    // Assert
    expect(priced.map((modifier) => modifier.priceDelta)).toEqual([0, 1_000]);
    expect(calculateItemUnitPrice(PRODUCT, priced)).toBe(8_000);
  });

  // CASE: Oreo ×2 and Nuez ×1 in a first-free group.
  // VALIDATES: Exactly one unit of the whole group is free, the first by menu order.
  it("should keep a single free unit across all repeated options", () => {
    // Arrange
    const selected = [pick("nuez"), pick("oreo"), pick("oreo")];

    // Act
    const priced = applyFirstOptionFree(TOPPINGS, selected);

    // Assert
    expect(priced.filter((modifier) => modifier.priceDelta === 0)).toHaveLength(1);
    expect(calculateItemUnitPrice(PRODUCT, priced)).toBe(7_000 + 1_000 + 1_500);
  });

  // CASE: The cashier adds the same customization twice, picking toppings in a different order.
  // VALIDATES: Equal picks share a cart line; a different count of the same topping does not.
  it("should build an order-independent key that still counts repeats", () => {
    // Arrange
    const first = [pick("oreo"), pick("nuez"), pick("oreo")];
    const reordered = [pick("nuez"), pick("oreo"), pick("oreo")];
    const fewer = [pick("nuez"), pick("oreo")];

    // Act
    const keys = [first, reordered, fewer].map((modifiers) => buildCartItemKey(PRODUCT.id, modifiers));

    // Assert
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).not.toBe(keys[2]);
  });

  // CASE: A cart line and its printed ticket show Oreo ×2 where one unit was free.
  // VALIDATES: Repeats collapse into one entry with the right count and combined surcharge.
  it("should collapse repeated picks for display and printing", () => {
    // Arrange
    const priced = applyFirstOptionFree(TOPPINGS, [pick("oreo"), pick("oreo"), pick("nuez")]);

    // Act
    const grouped = groupRepeatedModifiers(priced);
    const printed = collapseModifiersForPrint(priced);

    // Assert
    expect(grouped.map((entry) => [entry.modifier.optionName, entry.quantity, entry.totalDelta])).toEqual([
      ["Oreo", 2, 1_000],
      ["Nuez", 1, 1_500],
    ]);
    expect(printed).toEqual([
      { groupName: "Toppings", optionName: "Oreo ×2", textValue: null },
      { groupName: "Toppings", optionName: "Nuez", textValue: null },
    ]);
  });
});
