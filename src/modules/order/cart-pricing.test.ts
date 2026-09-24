import { describe, expect, it } from "vitest";

import type { Product } from "@/modules/menu";
import { PROMOTION_TYPE, type Promotion } from "@/modules/promotions";

import { addCompositeToCart, addItemToCart, expandCompositeItems, incrementItemQuantity } from "./cart-operations";
import { getLinePricing, priceCart } from "./cart-pricing";

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

describe("priceCart", () => {
  // CASE: The cashier adds a second latte while a 2x1 is active.
  // VALIDATES: The second latte is free and the line shows which promotion discounted it.
  it("should discount the cart line that qualifies for a promotion", () => {
    // Arrange
    const now = new Date(2026, 8, 21, 12, 0).getTime();
    const items = addItemToCart(addItemToCart([], LATTE, [], "line-1", now), LATTE, [], "line-2", now);

    // Act
    const pricing = priceCart(items, [TWO_FOR_ONE]);

    // Assert
    expect(pricing).toMatchObject({ itemsCount: 2, subtotal: 10_000, discountTotal: 5_000, total: 5_000 });
    expect(getLinePricing(pricing, "line-1")).toEqual({
      grossTotal: 10_000,
      discountAmount: 5_000,
      netTotal: 5_000,
      promotionNames: ["2x1 Latte"],
    });
  });
});

const BAGEL: Product = { ...LATTE, id: "bagel", categoryId: "bakery", name: "Bagel", price: 3_000, costPrice: 800 };
const AFTERNOON_BUNDLE: Product = {
  ...LATTE,
  id: "bundle",
  categoryId: "promos",
  name: "Paquete tarde",
  price: 6_000,
  kind: "composite",
  availabilitySchedule: {
    windows: [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 14 * 60, endMinute: 18 * 60 }],
    validFrom: null,
    validUntil: null,
  },
  components: [
    { productId: "latte", quantity: 1 },
    { productId: "bagel", quantity: 1 },
  ],
};
const BUNDLE_COMPONENTS = [
  { product: LATTE, quantity: 1 },
  { product: BAGEL, quantity: 1 },
];
const AT_17_00 = new Date(2026, 8, 21, 17, 0).getTime();
const AT_18_05 = new Date(2026, 8, 21, 18, 5).getTime();

describe("composite products", () => {
  let nextId = 0;
  const createLineId = () => `line-${(nextId += 1)}`;

  // CASE: The cashier picks the afternoon bundle at 17:00, inside its schedule.
  // VALIDATES: It becomes one line at the bundle price with its saving recorded as evidence.
  it("should charge the bundle price inside its schedule", () => {
    // Arrange
    const items = addCompositeToCart([], AFTERNOON_BUNDLE, BUNDLE_COMPONENTS, createLineId, AT_17_00);

    // Act
    const pricing = priceCart(items, []);

    // Assert
    expect(items).toHaveLength(1);
    expect(pricing).toMatchObject({ subtotal: 8_000, discountTotal: 2_000, total: 6_000 });
    expect(pricing.applications).toMatchObject([
      { kind: "composite", name: "Paquete tarde", discountAmount: 2_000, promotionId: null },
    ]);
  });

  // CASE: The cashier picks the same bundle at 18:05, after its schedule ended.
  // VALIDATES: The included products are added separately at their regular prices.
  it("should add the components separately outside the schedule", () => {
    // Arrange
    const items = addCompositeToCart([], AFTERNOON_BUNDLE, BUNDLE_COMPONENTS, createLineId, AT_18_05);

    // Act
    const pricing = priceCart(items, []);

    // Assert
    expect(items.map((item) => [item.product.id, item.quantity, item.composite])).toEqual([
      ["latte", 1, undefined],
      ["bagel", 1, undefined],
    ]);
    expect(pricing).toMatchObject({ discountTotal: 0, total: 8_000, applications: [] });
  });

  // CASE: A bundle added at 17:00 gets a second unit with "+" at 18:05.
  // VALIDATES: The late unit is added as separate products instead of inheriting the bundle price.
  it("should not extend the bundle price to units added after the schedule", () => {
    // Arrange
    const items = addCompositeToCart([], AFTERNOON_BUNDLE, BUNDLE_COMPONENTS, createLineId, AT_17_00);

    // Act
    const result = incrementItemQuantity(items, items[0].lineId, AT_18_05, createLineId);

    // Assert
    expect(result.map((item) => [item.product.id, item.quantity])).toEqual([
      ["bundle", 1],
      ["latte", 1],
      ["bagel", 1],
    ]);
    expect(priceCart(result, []).total).toBe(6_000 + 8_000);
  });

  // CASE: The kitchen receives an order with a bundle.
  // VALIDATES: The bundle is expanded into the products each station prepares.
  it("should expand composite lines for the kitchen", () => {
    // Arrange
    const once = addCompositeToCart([], AFTERNOON_BUNDLE, BUNDLE_COMPONENTS, createLineId, AT_17_00);
    const bundleTwice = addCompositeToCart(once, AFTERNOON_BUNDLE, BUNDLE_COMPONENTS, createLineId, AT_17_00);

    // Act
    const expanded = expandCompositeItems(bundleTwice);

    // Assert
    expect(expanded.map((item) => [item.product.name, item.quantity])).toEqual([
      ["Latte", 2],
      ["Bagel", 2],
    ]);
  });

  // CASE: A composite bundle is sent to a DiDi order.
  // VALIDATES: Delivery carts carry no discount evidence, so the order can be saved and the
  // platform amount is confirmed later.
  it("should not discount composites on delivery carts", () => {
    // Arrange
    const items = addCompositeToCart([], AFTERNOON_BUNDLE, BUNDLE_COMPONENTS, createLineId, AT_17_00);

    // Act
    const pricing = priceCart(items, [], { applyDiscounts: false });

    // Assert
    expect(pricing).toMatchObject({ subtotal: 8_000, discountTotal: 0, total: 8_000, applications: [] });
  });
});
