import { describe, expect, it } from "vitest";

import type { OrderDetail, OrderDetailItem } from "../order-management";
import { priceEditedOrder } from "./edit-order-pricing";

const ALWAYS = { windows: [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440 }], validFrom: null, validUntil: null };

const LATTES: OrderDetailItem = {
  id: "item-latte",
  productId: "latte",
  productName: "Latte",
  categoryId: "coffee",
  quantity: 4,
  unitPrice: 5_000,
  unitCost: 1_500,
  discountAmount: 10_000,
  orderPromotionId: "op-2x1",
  promotionName: "2x1 Latte",
  modifiers: [],
  children: [],
};

const BUNDLE: OrderDetailItem = {
  id: "item-bundle",
  productId: "bundle",
  productName: "Paquete tarde",
  categoryId: "promos",
  quantity: 2,
  unitPrice: 8_000,
  unitCost: 2_300,
  discountAmount: 4_000,
  orderPromotionId: "op-bundle",
  promotionName: "Paquete tarde",
  modifiers: [],
  children: [
    { productId: "latte", productName: "Latte", categoryId: "coffee", quantity: 2 },
    { productId: "bagel", productName: "Bagel", categoryId: "bakery", quantity: 4 },
  ],
};

const ORDER: OrderDetail = {
  id: "order",
  channel: "local",
  deliveryReference: null,
  confirmedAt: new Date(2026, 8, 21, 12, 5),
  orderName: null,
  ticketNumber: 7,
  createdAt: new Date(2026, 8, 21, 12, 0),
  total: 20_000 + 12_000,
  payments: [],
  items: [LATTES, BUNDLE],
  promotions: [
    {
      id: "op-2x1",
      promotionId: "promo-latte",
      kind: "nxm",
      name: "2x1 Latte",
      ruleSnapshot: {
        type: "nxm",
        buyQuantity: 2,
        payQuantity: 1,
        bundlePrice: null,
        targets: [{ productId: "latte", categoryId: null, quantity: 1 }],
        schedule: ALWAYS,
      },
      discountAmount: 10_000,
    },
    {
      id: "op-bundle",
      promotionId: null,
      kind: "composite",
      name: "Paquete tarde",
      ruleSnapshot: { type: "composite", productId: "bundle", price: 6_000 },
      discountAmount: 4_000,
    },
  ],
  isVoided: false,
  voidedAt: null,
};

describe("priceEditedOrder", () => {
  // CASE: A cashier removes one of four lattes from a 2x1 sale and one of two bundles.
  // VALIDATES: The 2x1 is re-applied from the sale's frozen rule, the leftover latte pays full
  // price, the bundle keeps its per-unit saving and children scale with it.
  it("should re-apply the frozen promotions to the edited quantities", () => {
    // Arrange
    const edited = [
      { ...LATTES, quantity: 3 },
      { ...BUNDLE, quantity: 1 },
    ];

    // Act
    const pricing = priceEditedOrder(ORDER, edited);

    // Assert
    expect(pricing.items.map((item) => [item.productId, item.quantity, item.discountAmount])).toEqual([
      ["latte", 2, 5_000],
      ["latte", 1, 0],
      ["bundle", 1, 2_000],
    ]);
    expect(pricing.items[2].children).toEqual([
      { productId: "latte", quantity: 1 },
      { productId: "bagel", quantity: 2 },
    ]);
    expect(pricing.total).toBe(5_000 + 5_000 + 6_000);
    expect(pricing.promotions.map((promotion) => [promotion.kind, promotion.discountAmount])).toEqual([
      ["nxm", 5_000],
      ["composite", 2_000],
    ]);
    expect(pricing.items[0].unitCost).toBe(1_500);
  });

  // CASE: The cashier removes enough lattes that the 2x1 no longer qualifies.
  // VALIDATES: The discount and its evidence disappear instead of staying orphaned.
  it("should drop a promotion that no longer qualifies after the edit", () => {
    // Arrange
    const edited = [{ ...LATTES, quantity: 1 }];

    // Act
    const pricing = priceEditedOrder(ORDER, edited);

    // Assert
    expect(pricing.promotions).toEqual([]);
    expect(pricing.total).toBe(5_000);
  });

  // CASE: A 2x1 sale had lattes with a $20 topping and one latte is removed then re-added in quantity.
  // VALIDATES: Re-pricing an edit discounts only the base price, so toppings stay charged.
  it("should keep charging toppings when re-pricing an edited sale", () => {
    // Arrange
    const withTopping: OrderDetailItem = {
      ...LATTES,
      quantity: 2,
      unitPrice: 7_000,
      discountAmount: 5_000,
      modifiers: [
        { groupId: "toppings", groupName: "Toppings", optionId: "extra", optionName: "Extra", textValue: null, priceDelta: 2_000 },
      ],
    };
    const order: OrderDetail = { ...ORDER, items: [withTopping] };

    // Act
    const pricing = priceEditedOrder(order, [withTopping]);

    // Assert
    expect(pricing.items[0]).toMatchObject({ quantity: 2, unitPrice: 7_000, discountAmount: 5_000 });
    expect(pricing.total).toBe(9_000);
  });
});

