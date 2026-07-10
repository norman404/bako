import { describe, expect, it } from "vitest";

import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";
import {
  addItemToCart,
  calculateCartTotals,
  decrementItemQuantity,
  incrementItemQuantity,
  removeItemFromCart,
  type CartItem,
} from "@/modules/order/domain/cart";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

function buildProduct(id: string, price: number): Product {
  return {
    id,
    categoryId: "coffee",
    menuIds: [],
    name: `Product ${id}`,
    description: "",
    price,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
  };
}

function buildSelected(
  groupId: string,
  optionId: string | null,
  textValue: string | null,
  priceDelta = 0,
  optionName: string | null = optionId ? `option-${optionId}` : null,
): SelectedModifier {
  return {
    groupId,
    groupName: `group-${groupId}`,
    optionId,
    optionName,
    priceDelta,
    textValue,
  };
}

function buildCartItem(
  lineId: string,
  product: Product,
  quantity: number,
  selectedModifiers: SelectedModifier[] = [],
): CartItem {
  return {
    lineId,
    product,
    quantity,
    selectedModifiers,
  };
}

describe("CartItem identity", () => {
  it("has a lineId and selectedModifiers field", () => {
    const product = buildProduct("p1", 5000);
    const item = buildCartItem("L1", product, 1, []);

    expect(item.lineId).toBe("L1");
    expect(item.selectedModifiers).toEqual([]);
  });

  it("treats the same product with different modifiers as separate lines", () => {
    const capuchino = buildProduct("p1", 5000);
    const withExtraHielo: SelectedModifier[] = [buildSelected("g1", "opt-extra", null, 500)];
    const withSinHielo: SelectedModifier[] = [buildSelected("g1", "opt-sin", null, 0)];

    const cart1 = addItemToCart([], capuchino, withExtraHielo, "L1");
    const cart2 = addItemToCart(cart1, capuchino, withSinHielo, "L2");

    expect(cart2).toHaveLength(2);
    expect(cart2[0].lineId).toBe("L1");
    expect(cart2[1].lineId).toBe("L2");
    expect(cart2[0].selectedModifiers).not.toEqual(cart2[1].selectedModifiers);
  });

  it("collapses the same product with identical modifiers into one line", () => {
    const espresso = buildProduct("p1", 5000);
    const noModifiers: SelectedModifier[] = [];

    const cart1 = addItemToCart([], espresso, noModifiers, "L1");
    const cart2 = addItemToCart(cart1, espresso, noModifiers, "L2");

    expect(cart2).toHaveLength(1);
    expect(cart2[0].quantity).toBe(2);
  });
});

describe("addItemToCart — modifier-based collapse", () => {
  it("adds a new line with the provided lineId when the combo is new", () => {
    const capuchino = buildProduct("p1", 5000);
    const modifiers: SelectedModifier[] = [buildSelected("g1", "opt1", null, 100)];

    const result = addItemToCart([], capuchino, modifiers, "L1");

    expect(result).toHaveLength(1);
    expect(result[0].lineId).toBe("L1");
    expect(result[0].selectedModifiers).toEqual(modifiers);
    expect(result[0].quantity).toBe(1);
  });

  it("increments quantity when the same product + identical modifiers are added again", () => {
    const capuchino = buildProduct("p1", 5000);
    const extra: SelectedModifier[] = [buildSelected("g1", "opt-extra", null, 500)];

    const cart1 = addItemToCart([], capuchino, extra, "L1");
    const cart2 = addItemToCart(cart1, capuchino, extra, "L2");

    expect(cart2).toHaveLength(1);
    expect(cart2[0].lineId).toBe("L1");
    expect(cart2[0].quantity).toBe(2);
  });

  it("collapses by product when both items have empty modifiers", () => {
    const espresso = buildProduct("p1", 5000);

    const cart1 = addItemToCart([], espresso, [], "L1");
    const cart2 = addItemToCart(cart1, espresso, [], "L2");

    expect(cart2).toHaveLength(1);
    expect(cart2[0].quantity).toBe(2);
  });

  it("does not collapse when text values differ", () => {
    const capuchino = buildProduct("p1", 5000);
    const sinAzucar: SelectedModifier[] = [buildSelected("g1", null, "Sin azúcar", 0)];
    const pocaAzucar: SelectedModifier[] = [buildSelected("g1", null, "Poca azúcar", 0)];

    const cart1 = addItemToCart([], capuchino, sinAzucar, "L1");
    const cart2 = addItemToCart(cart1, capuchino, pocaAzucar, "L2");

    expect(cart2).toHaveLength(2);
  });

  it("does not collapse when same option but text value differs", () => {
    const capuchino = buildProduct("p1", 5000);
    const paraLlevar: SelectedModifier[] = [buildSelected("g1", "opt-normal", "para llevar", 0)];
    const paraAqui: SelectedModifier[] = [buildSelected("g1", "opt-normal", "para aquí", 0)];

    const cart1 = addItemToCart([], capuchino, paraLlevar, "L1");
    const cart2 = addItemToCart(cart1, capuchino, paraAqui, "L2");

    expect(cart2).toHaveLength(2);
  });
});

describe("calculateCartTotals — surcharges", () => {
  it("includes a single modifier surcharge in the line subtotal", () => {
    const product = buildProduct("p1", 5000);
    const modifiers: SelectedModifier[] = [buildSelected("g1", "opt1", null, 500)];
    const items = [buildCartItem("L1", product, 2, modifiers)];

    const totals = calculateCartTotals(items);

    expect(totals.total).toBe(11000);
  });

  it("sums multiple modifier surcharges per unit", () => {
    const product = buildProduct("p1", 5000);
    const modifiers: SelectedModifier[] = [
      buildSelected("g1", "opt1", null, 500),
      buildSelected("g2", "opt2", null, 800),
    ];
    const items = [buildCartItem("L1", product, 1, modifiers)];

    const totals = calculateCartTotals(items);

    expect(totals.total).toBe(6300);
  });

  it("sums all line subtotals into the grand total", () => {
    const productA = buildProduct("p1", 5000);
    const productB = buildProduct("p2", 5000);
    const modifiersA: SelectedModifier[] = [buildSelected("g1", "opt1", null, 500)];
    const items = [
      buildCartItem("L1", productA, 2, modifiersA),
      buildCartItem("L2", productB, 1, []),
    ];

    const totals = calculateCartTotals(items);

    expect(totals.total).toBe(16000);
  });

  it("does not change the total when a text modifier has zero surcharge", () => {
    const product = buildProduct("p1", 5000);
    const modifiers: SelectedModifier[] = [buildSelected("g1", null, "Sin azúcar", 0)];
    const items = [buildCartItem("L1", product, 3, modifiers)];

    const totals = calculateCartTotals(items);

    expect(totals.total).toBe(15000);
  });

  it("behaves like legacy total when modifiers are empty", () => {
    const product = buildProduct("p1", 5000);
    const items = [buildCartItem("L1", product, 3, [])];

    const totals = calculateCartTotals(items);

    expect(totals.total).toBe(15000);
  });

  it("counts all item quantities in itemsCount", () => {
    const product = buildProduct("p1", 5000);
    const items = [
      buildCartItem("L1", product, 2),
      buildCartItem("L2", product, 1),
    ];

    const totals = calculateCartTotals(items);

    expect(totals.itemsCount).toBe(3);
  });
});

describe("line-based cart operations", () => {
  const productA = buildProduct("p1", 5000);
  const productB = buildProduct("p2", 3000);

  it("increments the quantity of the line matching the given lineId", () => {
    const items = [buildCartItem("L1", productA, 1), buildCartItem("L2", productB, 1)];

    const result = incrementItemQuantity(items, "L1");

    expect(result).toHaveLength(2);
    expect(result[0].quantity).toBe(2);
    expect(result[1].quantity).toBe(1);
  });

  it("decrements the quantity of the line matching the given lineId", () => {
    const items = [buildCartItem("L1", productA, 2), buildCartItem("L2", productB, 1)];

    const result = decrementItemQuantity(items, "L1");

    expect(result).toHaveLength(2);
    expect(result[0].quantity).toBe(1);
  });

  it("removes the line when quantity decrements to zero", () => {
    const items = [buildCartItem("L1", productA, 1), buildCartItem("L2", productB, 1)];

    const result = decrementItemQuantity(items, "L1");

    expect(result).toHaveLength(1);
    expect(result[0].lineId).toBe("L2");
  });

  it("removes only the line matching the given lineId", () => {
    const items = [buildCartItem("L1", productA, 1), buildCartItem("L2", productB, 1)];

    const result = removeItemFromCart(items, "L1");

    expect(result).toHaveLength(1);
    expect(result[0].lineId).toBe("L2");
  });

  it("leaves the cart unchanged when the lineId does not exist (increment)", () => {
    const items = [buildCartItem("L1", productA, 1)];

    const result = incrementItemQuantity(items, "L9");

    expect(result).toEqual(items);
  });

  it("leaves the cart unchanged when the lineId does not exist (decrement)", () => {
    const items = [buildCartItem("L1", productA, 1)];

    const result = decrementItemQuantity(items, "L9");

    expect(result).toEqual(items);
  });

  it("leaves the cart unchanged when the lineId does not exist (remove)", () => {
    const items = [buildCartItem("L1", productA, 1)];

    const result = removeItemFromCart(items, "L9");

    expect(result).toEqual(items);
  });

  it("does not match by productId — only the line with the matching lineId is affected", () => {
    const capuchino = buildProduct("p1", 5000);
    const withExtra: SelectedModifier[] = [buildSelected("g1", "opt-extra", null, 500)];
    const withSin: SelectedModifier[] = [buildSelected("g1", "opt-sin", null, 0)];
    const items = [
      buildCartItem("L1", capuchino, 1, withExtra),
      buildCartItem("L2", capuchino, 1, withSin),
    ];

    const result = incrementItemQuantity(items, "L1");

    expect(result).toHaveLength(2);
    expect(result[0].lineId).toBe("L1");
    expect(result[0].quantity).toBe(2);
    expect(result[1].lineId).toBe("L2");
    expect(result[1].quantity).toBe(1);
  });
});