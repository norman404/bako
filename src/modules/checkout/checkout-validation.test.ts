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
