import { describe, expect, it } from "vitest";

import { buildPaymentInputs, CHECKOUT_PAYMENT_MODE } from "./payment";

describe("buildPaymentInputs", () => {
  // CASE: The customer pays the full order by card without entering cash.
  // VALIDATES: Card payments apply the complete total and do not require cash input.
  it("should create one card payment when the mode is card", () => {
    // Arrange
    const total = 1_500;

    // Act
    const result = buildPaymentInputs(CHECKOUT_PAYMENT_MODE.CARD, "", total);

    // Assert
    expect(result).toEqual([{ method: "card", amount: total, cashReceived: null }]);
  });

  // CASE: The customer gives more cash than the order total.
  // VALIDATES: The payment stores the applied total separately from the cash received.
  it("should preserve received cash when cash exceeds the order total", () => {
    // Arrange
    const total = 1_500;

    // Act
    const result = buildPaymentInputs(CHECKOUT_PAYMENT_MODE.CASH, "20.00", total);

    // Assert
    expect(result).toEqual([{ method: "cash", amount: total, cashReceived: 2_000 }]);
  });

  // CASE: The customer applies part of the total in cash and the remainder on card.
  // VALIDATES: Mixed payment amounts add up to the order total without change.
  it("should split the total when mixed cash is strictly within the total", () => {
    // Arrange
    const total = 1_500;

    // Act
    const result = buildPaymentInputs(CHECKOUT_PAYMENT_MODE.MIXED, "6.50", total);

    // Assert
    expect(result).toEqual([
      { method: "cash", amount: 650, cashReceived: 650 },
      { method: "card", amount: 850, cashReceived: null },
    ]);
  });

  // CASE: The customer gives less cash than the order total in a cash-only payment.
  // VALIDATES: An insufficient cash amount is rejected before an order can be created.
  it("should reject cash payment when received cash is below the total", () => {
    // Arrange
    const total = 1_500;

    // Act
    const result = buildPaymentInputs(CHECKOUT_PAYMENT_MODE.CASH, "14.99", total);

    // Assert
    expect(result).toBeNull();
  });

  // CASE: The mixed cash amount is zero.
  // VALIDATES: A mixed payment requires a positive cash contribution.
  it("should reject mixed payment when cash is zero", () => {
    // Arrange
    const total = 1_500;

    // Act
    const result = buildPaymentInputs(CHECKOUT_PAYMENT_MODE.MIXED, "0", total);

    // Assert
    expect(result).toBeNull();
  });

  // CASE: The mixed cash amount equals the complete order total.
  // VALIDATES: A mixed payment requires a remaining card amount.
  it("should reject mixed payment when cash equals the total", () => {
    // Arrange
    const total = 1_500;

    // Act
    const result = buildPaymentInputs(CHECKOUT_PAYMENT_MODE.MIXED, "15.00", total);

    // Assert
    expect(result).toBeNull();
  });
});
