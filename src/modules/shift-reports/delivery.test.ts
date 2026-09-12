import { describe, expect, it } from "vitest";
import { buildDeliveryConfirmation, MAX_DELIVERY_AMOUNT, parseDeliveryAmount, validateDeliveryConfirmation, type ConfirmDeliveryInput } from "./delivery";

const NOW = new Date("2026-08-01T16:00:00Z");
const PENDING = { channel: "didi", confirmedAt: null, voidedAt: null, total: 0, catalogTotal: 14000 };
const CASH: ConfirmDeliveryInput = { amount: 15000, method: "cash", shiftId: "B" };

describe("delivery confirmation", () => {
  // CASE: Catalog products total $140, but the courier hands the cashier $150.
  // VALIDATES: The manual amount alone becomes both the sale and cash applied in the collection shift.
  it("should record the manual amount when cash is handed over", () => {
    // Arrange
    const order = { ...PENDING, catalogTotal: 14000 };
    // Act
    const confirmation = buildDeliveryConfirmation(order, CASH, NOW);
    // Assert
    expect(confirmation).toEqual({
      order: { total: 15000, confirmedAt: NOW, financialShiftId: "B" },
      payment: { method: "cash", amount: 15000, cashReceived: 15000, createdAt: NOW },
    });
  });

  // CASE: The delivery is paid in the app, so the cashier does not look up the app payout.
  // VALIDATES: The sale keeps the catalog total while the platform payment registers zero.
  it("should keep the catalog sale and zero the payment when payment is in the app", () => {
    // Arrange
    const input: ConfirmDeliveryInput = { amount: 5000, method: "platform", shiftId: "B" };
    // Act
    const confirmation = buildDeliveryConfirmation(PENDING, input, NOW);
    // Assert
    expect(confirmation.order.total).toBe(14000);
    expect(confirmation.payment).toEqual({ method: "platform", amount: 0, cashReceived: null, createdAt: NOW });
  });

  // CASE: The order has no valid catalog total recorded for an app collection.
  // VALIDATES: An invalid catalog total is rejected instead of registering a bad charge.
  it("should reject an invalid catalog total when payment is in the app", () => {
    // Arrange
    const input: ConfirmDeliveryInput = { amount: 0, method: "platform", shiftId: "B" };
    // Act
    const error = validateDeliveryConfirmation({ ...PENDING, catalogTotal: -1 }, input);
    // Assert
    expect(error?.code).toBe("invalidDeliveryAmount");
  });

  // CASE: Confirmation is retried or races with order cancellation.
  // VALIDATES: Already confirmed and cancelled orders cannot be collected again.
  it("should reject a second collection when the order is confirmed or voided", () => {
    // Arrange
    const confirmed = { ...PENDING, confirmedAt: NOW };
    const cancelled = { ...PENDING, voidedAt: NOW };
    // Act
    const duplicate = validateDeliveryConfirmation(confirmed, CASH);
    const voided = validateDeliveryConfirmation(cancelled, CASH);
    // Assert
    expect(duplicate?.code).toBe("deliveryAlreadyConfirmed");
    expect(voided?.code).toBe("orderAlreadyVoided");
    expect(() => buildDeliveryConfirmation(confirmed, CASH, NOW)).toThrow();
  });

  // CASE: Invalid money crosses the persistence boundary instead of coming through the form.
  // VALIDATES: Negative, fractional, non-finite and out-of-range cents are rejected.
  it.each([-1, 0.1, Number.NaN, Infinity, MAX_DELIVERY_AMOUNT + 1])("should reject invalid cents when amount is %s", (amount) => {
    // Arrange
    const input = { ...CASH, amount };
    // Act
    const error = validateDeliveryConfirmation(PENDING, input);
    // Assert
    expect(error?.code).toBe("invalidDeliveryAmount");
  });

  // CASE: A fully discounted order or the native boundary maximum is entered explicitly.
  // VALIDATES: Valid boundary totals are not mistaken for an unknown amount.
  it.each([0, MAX_DELIVERY_AMOUNT])("should accept an explicit boundary total when amount is %s", (amount) => {
    // Arrange
    const input = { ...CASH, amount };
    // Act
    const error = validateDeliveryConfirmation(PENDING, input);
    // Assert
    expect(error).toBeNull();
  });

  // CASE: A cashier types pesos into the final amount field.
  // VALIDATES: Decimal separators convert to integer cents without guessing incomplete or malformed inputs.
  it.each([
    ["150", 15000], ["50,25", 5025], ["0", 0], [".50", 50],
    ["", null], ["-1", null], ["1.234", null], ["1.2.3", null], ["abc150", null], ["42949672.96", null],
  ])("should parse the final amount correctly when input is %s", (input, expected) => {
    // Arrange
    const value = String(input);
    // Act
    const amount = parseDeliveryAmount(value);
    // Assert
    expect(amount).toBe(expected);
  });
});
