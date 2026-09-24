import { describe, expect, it } from "vitest";
import { initialOrderAccounting, normalizeCreateOrderInput, validateCreateOrderInput } from "./checkout-validation";
import type { CreateOrderInput } from "./order";

const ITEMS: CreateOrderInput["items"] = [{ productId: "coffee", quantity: 2, unitPrice: 7000, unitCost: 2000, modifiers: [] }];
const NOW = new Date("2026-08-01T12:00:00Z");

describe("delivery creation", () => {
  // CASE: A DiDi order is sent to preparation before its amount or collection method is known.
  // VALIDATES: It has no payments, recognized sale or financial shift; the catalog snapshot is preserved.
  it("should save an unconfirmed zero financial total when a delivery has no payment", () => {
    // Arrange
    const input = normalizeCreateOrderInput({ channel: "didi", deliveryReference: "  APP-42  ", shiftId: "A", items: ITEMS, payments: [] });
    // Act
    const error = validateCreateOrderInput(input);
    const accounting = initialOrderAccounting(input, NOW);
    // Assert
    expect(error).toBeNull();
    expect(accounting).toEqual({ total: 0, confirmedAt: null, financialShiftId: null });
    expect(input.payments).toEqual([]);
    expect(input.deliveryReference).toBe("APP-42");
    expect(input.items[0].unitPrice).toBe(7000);
  });

  // CASE: A pending Uber order is accidentally submitted with a guessed cash payment.
  // VALIDATES: Saving a delivery never fabricates a payment.
  it("should reject guessed payments when saving a delivery", () => {
    // Arrange
    const input = normalizeCreateOrderInput({ channel: "uber", items: ITEMS, payments: [{ method: "cash", amount: 14000, cashReceived: 14000 }] });
    // Act
    const error = validateCreateOrderInput(input);
    // Assert
    expect(error?.code).toBe("pendingPaymentNotAllowed");
  });

  // CASE: A local sale uses the existing mixed cash/card flow.
  // VALIDATES: Its catalog total, payment requirement and shift attribution remain unchanged.
  it("should preserve local payment rules when creating a local sale", () => {
    // Arrange
    const input = normalizeCreateOrderInput({ items: ITEMS, shiftId: "A", payments: [
      { method: "cash", amount: 5000, cashReceived: 5000 }, { method: "card", amount: 9000 },
    ] });
    // Act
    const error = validateCreateOrderInput(input);
    const accounting = initialOrderAccounting(input, NOW);
    const missingPayment = validateCreateOrderInput({ ...input, payments: [] });
    // Assert
    expect(error).toBeNull();
    expect(accounting).toEqual({ total: 14000, confirmedAt: NOW, financialShiftId: "A" });
    expect(missingPayment?.code).toBe("paymentRequired");
  });

  // CASE: A local sale tries to treat an app collection as a terminal payment.
  // VALIDATES: App collection is restricted to delivery confirmation.
  it("should reject platform payment when creating a local sale", () => {
    // Arrange
    const input = normalizeCreateOrderInput({ items: ITEMS, payments: [{ method: "platform", amount: 14000 }] });
    // Act
    const error = validateCreateOrderInput(input);
    // Assert
    expect(error?.code).toBe("invalidPaymentMethod");
  });
});

const TWO_FOR_ONE: NonNullable<CreateOrderInput["promotions"]>[number] = {
  ref: "p1",
  promotionId: "promo-2x1",
  kind: "nxm",
  name: "2x1 Café",
  ruleSnapshot: { buyQuantity: 2, payQuantity: 1 },
  discountAmount: 7000,
};
const DISCOUNTED_ITEMS: CreateOrderInput["items"] = [{ ...ITEMS[0], discountAmount: 7000, promotionRef: "p1" }];

describe("promotion discounts", () => {
  // CASE: A local 2x1 sale is charged for one of its two coffees.
  // VALIDATES: The order total and payment requirement are net of the reconciled discount.
  it("should charge the net total when a discount matches its promotion", () => {
    // Arrange
    const input = normalizeCreateOrderInput({
      items: DISCOUNTED_ITEMS,
      promotions: [TWO_FOR_ONE],
      payments: [{ method: "card", amount: 7000 }],
    });
    // Act
    const error = validateCreateOrderInput(input);
    const accounting = initialOrderAccounting(input, NOW);
    // Assert
    expect(error).toBeNull();
    expect(accounting.total).toBe(7000);
  });

  // CASE: A payload tampers with discounts, references or channels.
  // VALIDATES: Unjustified, oversized, orphaned, unreconciled or delivery discounts are rejected.
  it("should reject discounts that are not backed by consistent promotion evidence", () => {
    // Arrange
    const payments = [{ method: "card" as const, amount: 7000 }];
    const cases: Array<[CreateOrderInput, string]> = [
      [{ items: [{ ...ITEMS[0], discountAmount: 7000 }], payments }, "orderPromotionInvalid"],
      [{ items: [{ ...ITEMS[0], discountAmount: 14001, promotionRef: "p1" }], promotions: [TWO_FOR_ONE], payments }, "orderItemDiscountInvalid"],
      [{ items: [{ ...ITEMS[0], discountAmount: 7000, promotionRef: "missing" }], promotions: [TWO_FOR_ONE], payments }, "orderPromotionInvalid"],
      [{ items: DISCOUNTED_ITEMS, promotions: [{ ...TWO_FOR_ONE, discountAmount: 5000 }], payments }, "orderPromotionInvalid"],
      [{ channel: "uber", items: DISCOUNTED_ITEMS, promotions: [TWO_FOR_ONE], payments: [] }, "orderPromotionInvalid"],
    ];
    // Act
    const codes = cases.map(([input]) => validateCreateOrderInput(normalizeCreateOrderInput(input))?.code);
    // Assert
    expect(codes).toEqual(cases.map(([, code]) => code));
  });

  // CASE: A payment covers the catalog price but ignores the promotion discount.
  // VALIDATES: Payments must match the net total, not the gross one.
  it("should reject payments that ignore the discount", () => {
    // Arrange
    const input = normalizeCreateOrderInput({
      items: DISCOUNTED_ITEMS,
      promotions: [TWO_FOR_ONE],
      payments: [{ method: "card", amount: 14000 }],
    });
    // Act
    const error = validateCreateOrderInput(input);
    // Assert
    expect(error?.code).toBe("paymentTotalMismatch");
  });
});
