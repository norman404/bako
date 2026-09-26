import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/menu";
import { priceCart, type CartItem } from "@/modules/order";
import { PROMOTION_TYPE, type Promotion } from "@/modules/promotions";
import { buildCreateOrderInput, CHECKOUT_PAYMENT_MODE } from "./builders";

const PRODUCT: Product = {
  id: "coffee",
  categoryId: "drinks",
  menuIds: ["main"],
  name: "Coffee",
  description: "",
  price: 1_000,
  costPrice: 400,
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

const ITEMS: CartItem[] = [
  {
    lineId: "line-1",
    product: PRODUCT,
    quantity: 1,
    selectedModifiers: [],
    unitAddedAt: [0],
  },
];

describe("buildCreateOrderInput", () => {
  // CASE: The cashier names the open cart before charging it.
  // VALIDATES: Checkout payload preserves the order name alongside items and payments.
  it("should include the order name when building the checkout payload", () => {
    // Arrange
    const orderName = "Mesa 4";

    // Act
    const result = buildCreateOrderInput(
      ITEMS,
      priceCart(ITEMS, []),
      CHECKOUT_PAYMENT_MODE.CASH,
      "10.00",
      orderName,
    );

    // Assert
    expect(result?.orderName).toBe(orderName);
  });

  // CASE: Three coffees are charged while a 2x1 covers two of them.
  // VALIDATES: The line is split into a discounted and a regular item, the payment covers the net
  // total, and the promotion evidence matches the discount.
  it("should split promoted lines and charge the net total", () => {
    // Arrange
    const items: CartItem[] = [{ ...ITEMS[0], quantity: 3, unitAddedAt: [0, 0, 0] }];
    const promotion: Promotion = {
      id: "promo-coffee",
      name: "2x1 Café",
      type: PROMOTION_TYPE.NXM,
      buyQuantity: 2,
      payQuantity: 1,
      bundlePrice: null,
      schedule: { windows: [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440 }], validFrom: null, validUntil: null },
      isActive: true,
      targets: [{ productId: "coffee", categoryId: null, quantity: 1 }],
    };

    // Act
    const result = buildCreateOrderInput(items, priceCart(items, [promotion]), CHECKOUT_PAYMENT_MODE.CARD, "", "");

    // Assert
    expect(result?.items.map((item) => [item.quantity, item.discountAmount, item.promotionRef])).toEqual([
      [2, 1_000, "promo-1"],
      [1, 0, null],
    ]);
    expect(result?.promotions).toMatchObject([{ ref: "promo-1", name: "2x1 Café", discountAmount: 1_000 }]);
    expect(result?.payments).toEqual([{ method: "card", amount: 2_000, cashReceived: null }]);
  });
});
