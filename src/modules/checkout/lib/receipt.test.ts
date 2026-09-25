import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/menu";
import { addCompositeToCart, addItemToCart, priceCart } from "@/modules/order";
import { PROMOTION_TYPE, type Promotion } from "@/modules/promotions";

import { buildOrderItemsInput } from "./builders";
import { buildReceiptLines } from "./receipt";

const LATTE: Product = {
  id: "latte",
  categoryId: "coffee",
  menuIds: [],
  name: "Latte",
  description: "",
  price: 5_000,
  costPrice: 1_500,
  prepTimeMinutes: 2,
  image: "",
  isPopular: false,
  kind: "standard",
  availabilitySchedule: null,
  components: [],
  createdAt: new Date(0),
  updatedAt: new Date(0),
  deletedAt: null,
};
const BAGEL: Product = { ...LATTE, id: "bagel", name: "Bagel", price: 3_000, costPrice: 800 };
const BUNDLE: Product = {
  ...LATTE,
  id: "bundle",
  name: "Paquete tarde",
  price: 6_000,
  costPrice: 0,
  kind: "composite",
  components: [
    { productId: "latte", quantity: 1 },
    { productId: "bagel", quantity: 2 },
  ],
};
const TWO_FOR_ONE: Promotion = {
  id: "promo-latte",
  name: "2x1 Latte",
  type: PROMOTION_TYPE.NXM,
  buyQuantity: 2,
  payQuantity: 1,
  bundlePrice: null,
  schedule: { windows: [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440 }], validFrom: null, validUntil: null },
  isActive: true,
  targets: [{ productId: "latte", categoryId: null, quantity: 1 }],
};

function buildCart() {
  const now = new Date(2026, 8, 21, 12, 0).getTime();
  let id = 0;
  const createLineId = () => `line-${(id += 1)}`;
  const withLattes = addItemToCart(addItemToCart([], LATTE, [], createLineId(), now), LATTE, [], createLineId(), now);
  return addCompositeToCart(withLattes, BUNDLE, [
    { product: LATTE, quantity: 1 },
    { product: BAGEL, quantity: 2 },
  ], createLineId, now);
}

describe("buildReceiptLines", () => {
  // CASE: A sale with a 2x1 and a composite bundle is printed.
  // VALIDATES: Printed lines minus printed discounts equal the charged total, and the bundle lists its contents.
  it("should print lines and discounts that reconcile with the charged total", () => {
    // Arrange
    const items = buildCart();
    const pricing = priceCart(items, [TWO_FOR_ONE]);

    // Act
    const receipt = buildReceiptLines(items, pricing);

    // Assert
    const gross = receipt.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discounts = receipt.discounts.reduce((sum, discount) => sum + discount.amount, 0);
    expect(gross - discounts).toBe(pricing.total);
    expect(receipt.items[0]).toMatchObject({ name: "Latte", discount: 5_000, discountLabel: "2x1 Latte" });
    expect(receipt.items[1].children).toEqual([
      { name: "Latte", quantity: 1 },
      { name: "Bagel", quantity: 2 },
    ]);
  });
});

describe("buildOrderItemsInput with composites", () => {
  // CASE: A composite bundle is saved.
  // VALIDATES: The parent carries the components' cost and every child is recorded for the kitchen and reports.
  it("should save composite children and the components' cost", () => {
    // Arrange
    const items = buildCart();

    // Act
    const orderItems = buildOrderItemsInput(items, priceCart(items, []));

    // Assert
    expect(orderItems[1]).toMatchObject({
      productId: "bundle",
      unitPrice: 11_000,
      unitCost: 1_500 + 2 * 800,
      discountAmount: 5_000,
      children: [
        { productId: "latte", quantity: 1 },
        { productId: "bagel", quantity: 2 },
      ],
    });
  });
});
