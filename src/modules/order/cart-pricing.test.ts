import { describe, expect, it } from "vitest";

import type { Product, SelectedModifier } from "@/modules/menu";
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
    expect(getLinePricing(pricing, items[0]?.lineId ?? "").grossTotal).toBe(8_000);
  });
});

const EXTRA_TOPPING: SelectedModifier = {
  groupId: "toppings",
  groupName: "Toppings",
  optionId: "extra-1",
  optionName: "Extra 1",
  priceDelta: 1_000,
  textValue: null,
};
const SECOND_TOPPING: SelectedModifier = { ...EXTRA_TOPPING, optionId: "extra-2", optionName: "Extra 2" };
const PLAIN = { ...LATTE, id: "plain", name: "Frappé", price: 7_000 };
const OTHER = { ...LATTE, id: "other", name: "Smoothie", price: 7_000 };
const ALWAYS_OPEN = TWO_FOR_ONE.schedule;

describe("promotions with paid modifiers", () => {
  const now = new Date(2026, 8, 21, 12, 0).getTime();

  // CASE: A $70 product with two $10 toppings is bundled with another $70 product for $100.
  // VALIDATES: The bundle covers the products only; the $20 of toppings is still charged.
  it("should charge toppings on top of a bundle price", () => {
    // Arrange
    const bundle: Promotion = {
      ...TWO_FOR_ONE,
      id: "promo-bundle",
      name: "Frappé + Smoothie",
      type: PROMOTION_TYPE.BUNDLE,
      buyQuantity: null,
      payQuantity: null,
      bundlePrice: 10_000,
      schedule: ALWAYS_OPEN,
      targets: [
        { productId: "plain", categoryId: null, quantity: 1 },
        { productId: "other", categoryId: null, quantity: 1 },
      ],
    };
    const items = addItemToCart(
      addItemToCart([], PLAIN, [EXTRA_TOPPING, SECOND_TOPPING], "line-1", now),
      OTHER,
      [],
      "line-2",
      now,
    );

    // Act
    const pricing = priceCart(items, [bundle]);

    // Assert
    expect(pricing).toMatchObject({ subtotal: 16_000, discountTotal: 4_000, total: 12_000 });
  });

  // CASE: In a 2x1, the free unit was ordered with a $10 topping.
  // VALIDATES: The product is free but its topping is charged.
  it("should charge the toppings of the free unit in a 2x1", () => {
    // Arrange
    const twoForOne: Promotion = { ...TWO_FOR_ONE, targets: [{ productId: "plain", categoryId: null, quantity: 1 }] };
    const items = addItemToCart(
      addItemToCart([], PLAIN, [EXTRA_TOPPING], "line-1", now),
      PLAIN,
      [],
      "line-2",
      now,
    );

    // Act
    const pricing = priceCart(items, [twoForOne]);

    // Assert
    expect(pricing).toMatchObject({ subtotal: 15_000, discountTotal: 7_000, total: 8_000 });
  });

  // CASE: A modifier lowers the price below the catalog price (e.g. "no cheese" −$5).
  // VALIDATES: The discount never exceeds what the line charges.
  it("should cap the discount at the charged price when a modifier is negative", () => {
    // Arrange
    const twoForOne: Promotion = { ...TWO_FOR_ONE, targets: [{ productId: "plain", categoryId: null, quantity: 1 }] };
    const discountModifier: SelectedModifier = { ...EXTRA_TOPPING, optionId: "less", priceDelta: -500 };
    const items = addItemToCart([], PLAIN, [discountModifier], "line-1", now);
    const withSecond = addItemToCart(items, PLAIN, [discountModifier], "line-2", now);

    // Act
    const pricing = priceCart(withSecond, [twoForOne]);

    // Assert
    expect(pricing).toMatchObject({ subtotal: 13_000, discountTotal: 6_500, total: 6_500 });
    expect(pricing.segments.every((segment) => segment.discountAmount <= segment.unitPrice * segment.quantity)).toBe(true);
  });
});
