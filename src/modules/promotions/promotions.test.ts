import { describe, expect, it } from "vitest";

import type { WeeklySchedule } from "@/lib/weekly-schedule";

import { allocateProportionally, applyPromotions } from "./promotions";
import { PROMOTION_TYPE, type PricingLine, type Promotion } from "./types";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const ALWAYS: WeeklySchedule = {
  windows: [{ days: ALL_DAYS, startMinute: 0, endMinute: 24 * 60 }],
  validFrom: null,
  validUntil: null,
};
const UNTIL_SIX_PM: WeeklySchedule = {
  windows: [{ days: ALL_DAYS, startMinute: 14 * 60, endMinute: 18 * 60 }],
  validFrom: null,
  validUntil: null,
};

const AT_NOON = new Date(2026, 8, 21, 12, 0).getTime();
const AT_17_59 = new Date(2026, 8, 21, 17, 59).getTime();
const AT_18_01 = new Date(2026, 8, 21, 18, 1).getTime();

const LATTE_2X1: Promotion = {
  id: "promo-latte",
  name: "2x1 Latte",
  type: PROMOTION_TYPE.NXM,
  buyQuantity: 2,
  payQuantity: 1,
  bundlePrice: null,
  schedule: ALWAYS,
  isActive: true,
  targets: [{ productId: "latte", categoryId: null, quantity: 1 }],
};

const BREAKFAST_BUNDLE: Promotion = {
  id: "promo-breakfast",
  name: "Desayuno",
  type: PROMOTION_TYPE.BUNDLE,
  buyQuantity: null,
  payQuantity: null,
  bundlePrice: 10_000,
  schedule: ALWAYS,
  isActive: true,
  targets: [
    { productId: "latte", categoryId: null, quantity: 1 },
    { productId: "bagel", categoryId: null, quantity: 1 },
    { productId: "juice", categoryId: null, quantity: 1 },
  ],
};

function line(lineId: string, productId: string, unitPrice: number, quantity: number, addedAt = AT_NOON): PricingLine {
  return {
    lineId,
    productId,
    categoryId: "coffee",
    unitPrice,
    basePrice: unitPrice,
    unitAddedAt: Array.from({ length: quantity }, () => addedAt),
  };
}

describe("applyPromotions", () => {
  // CASE: A customer orders two, three and four lattes during a 2x1.
  // VALIDATES: Every complete pair gets one free unit and the leftover is charged in full.
  it("should make one unit free per complete pair in a 2x1", () => {
    // Arrange
    const carts = [2, 3, 4].map((quantity) => [line("l1", "latte", 5_000, quantity)]);

    // Act
    const results = carts.map((lines) => applyPromotions(lines, [LATTE_2X1]));

    // Assert
    expect(results.map((result) => result.total)).toEqual([5_000, 10_000, 10_000]);
    expect(results[1].segments).toEqual([
      { lineId: "l1", quantity: 2, unitPrice: 5_000, discountAmount: 5_000, applicationRef: "promo-1" },
      { lineId: "l1", quantity: 1, unitPrice: 5_000, discountAmount: 0, applicationRef: null },
    ]);
    expect(results[2].applications.map((application) => application.discountAmount)).toEqual([5_000, 5_000]);
  });

  // CASE: A 3x2 applies to any product in the coffee category.
  // VALIDATES: Mixed products can combine and the cheapest one is the free unit.
  it("should give away the cheapest unit when a group promotion mixes products", () => {
    // Arrange
    const promotion: Promotion = {
      ...LATTE_2X1,
      id: "promo-coffee",
      name: "3x2 Cafés",
      buyQuantity: 3,
      payQuantity: 2,
      targets: [{ productId: null, categoryId: "coffee", quantity: 1 }],
    };
    const lines = [line("l1", "latte", 5_000, 1), line("l2", "americano", 3_500, 1), line("l3", "mocha", 6_000, 1)];

    // Act
    const result = applyPromotions(lines, [promotion]);

    // Assert
    expect(result.discountTotal).toBe(3_500);
    expect(result.segments.find((segment) => segment.lineId === "l2")?.discountAmount).toBe(3_500);
  });

  // CASE: The bundle price is higher than buying the three products separately.
  // VALIDATES: A promotion never makes the customer pay more.
  it("should not apply a bundle whose price is not a saving", () => {
    // Arrange
    const lines = [line("l1", "latte", 3_000, 1), line("l2", "bagel", 3_000, 1), line("l3", "juice", 3_000, 1)];

    // Act
    const result = applyPromotions(lines, [BREAKFAST_BUNDLE]);

    // Assert
    expect(result.applications).toEqual([]);
    expect(result.total).toBe(9_000);
  });

  // CASE: Two lattes, a bagel and a juice qualify for both a 2x1 and the breakfast bundle.
  // VALIDATES: The engine picks whichever combination gives the lowest total, not the first match.
  it("should pick the combination with the lowest total when promotions compete", () => {
    // Arrange
    const lines = [line("l1", "latte", 5_000, 2), line("l2", "bagel", 4_000, 1), line("l3", "juice", 4_500, 1)];

    // Act
    const result = applyPromotions(lines, [LATTE_2X1, BREAKFAST_BUNDLE]);

    // Assert
    // 2x1 alone saves 5,000; bundle alone saves 3,500; both cannot share a latte.
    expect(result.total).toBe(18_500 - 5_000);
    expect(result.applications.map((application) => application.promotionId)).toEqual(["promo-latte"]);
  });

  // CASE: The bundle saves more than the 2x1 on the same lattes.
  // VALIDATES: The optimizer is driven by savings, not by promotion type or order.
  it("should prefer the bundle when it saves more than the competing 2x1", () => {
    // Arrange
    const lines = [line("l1", "latte", 5_000, 2), line("l2", "bagel", 8_000, 1), line("l3", "juice", 8_000, 1)];

    // Act
    const result = applyPromotions(lines, [LATTE_2X1, BREAKFAST_BUNDLE]);

    // Assert
    // Bundle saves 11,000 (21,000 → 10,000); the 2x1 would only save 5,000.
    expect(result.discountTotal).toBe(11_000);
    expect(result.applications.map((application) => application.promotionId)).toEqual(["promo-breakfast"]);
  });

  // CASE: One latte is added at 17:59 and another at 18:01 on a promotion that ends at 18:00.
  // VALIDATES: Eligibility is decided by the time each unit was added, not the time of payment.
  it("should only count units added while the promotion was active", () => {
    // Arrange
    const promotion = { ...LATTE_2X1, schedule: UNTIL_SIX_PM };
    const lateLine: PricingLine = { ...line("l1", "latte", 5_000, 1), unitAddedAt: [AT_17_59, AT_18_01] };
    const onTimeLine: PricingLine = { ...line("l1", "latte", 5_000, 1), unitAddedAt: [AT_17_59, AT_17_59] };

    // Act
    const lateResult = applyPromotions([lateLine], [promotion]);
    const onTimeResult = applyPromotions([onTimeLine], [promotion]);

    // Assert
    expect(lateResult.discountTotal).toBe(0);
    expect(onTimeResult.discountTotal).toBe(5_000);
  });

  // CASE: A bundle discount has to be split across products with uneven prices.
  // VALIDATES: The per-line discounts are whole cents and add up exactly to the promotion discount.
  it("should split a bundle discount into cents that add up exactly", () => {
    // Arrange
    const lines = [line("l1", "latte", 3_333, 1), line("l2", "bagel", 3_333, 1), line("l3", "juice", 3_334, 1)];
    const promotion = { ...BREAKFAST_BUNDLE, bundlePrice: 9_999 };

    // Act
    const result = applyPromotions(lines, [promotion]);

    // Assert
    const allocated = result.segments.reduce((sum, segment) => sum + segment.discountAmount, 0);
    expect(result.discountTotal).toBe(1);
    expect(allocated).toBe(1);
    expect(result.segments.every((segment) => Number.isInteger(segment.discountAmount))).toBe(true);
  });

  // CASE: The same cart is priced with promotions loaded in a different order.
  // VALIDATES: Pricing is deterministic, so the cart never flickers between results.
  it("should return the same result regardless of promotion order", () => {
    // Arrange
    const lines = [line("l1", "latte", 5_000, 3), line("l2", "bagel", 5_000, 1), line("l3", "juice", 5_000, 1)];

    // Act
    const forward = applyPromotions(lines, [LATTE_2X1, BREAKFAST_BUNDLE]);
    const reversed = applyPromotions(lines, [BREAKFAST_BUNDLE, LATTE_2X1]);

    // Assert
    expect(reversed).toEqual(forward);
  });

  // CASE: A promotion was switched off by the manager.
  // VALIDATES: Inactive promotions are ignored and the cart is charged at list price.
  it("should ignore inactive promotions", () => {
    // Arrange
    const lines = [line("l1", "latte", 5_000, 2)];

    // Act
    const result = applyPromotions(lines, [{ ...LATTE_2X1, isActive: false }]);

    // Assert
    expect(result).toMatchObject({ subtotal: 10_000, discountTotal: 0, total: 10_000, applications: [] });
  });

  // CASE: A busy table orders dozens of products that match several promotions.
  // VALIDATES: The search stays bounded and still returns a consistent, fully allocated price.
  it("should stay consistent on a large cart", () => {
    // Arrange
    const lines = [line("l1", "latte", 5_000, 25), line("l2", "bagel", 4_000, 25), line("l3", "juice", 4_500, 25)];

    // Act
    const result = applyPromotions(lines, [LATTE_2X1, BREAKFAST_BUNDLE]);

    // Assert
    const allocated = result.segments.reduce((sum, segment) => sum + segment.discountAmount, 0);
    const quantity = result.segments.reduce((sum, segment) => sum + segment.quantity, 0);
    expect(allocated).toBe(result.discountTotal);
    expect(quantity).toBe(75);
    expect(result.discountTotal).toBeGreaterThanOrEqual(12 * 5_000);
  });
});

describe("allocateProportionally", () => {
  // CASE: A discount does not divide evenly across equal prices.
  // VALIDATES: Leftover cents go to the earliest lines and nothing is lost.
  it("should hand out leftover cents without losing any", () => {
    // Arrange
    const weights = [100, 100, 100];

    // Act
    const shares = allocateProportionally(100, weights);

    // Assert
    expect(shares).toEqual([34, 33, 33]);
  });
});
