import { describe, expect, it } from "vitest";
import type { OrderDetail } from "../order-management";
import { buildReprintOrderOptions } from "./reprint-order";

const ORDER: OrderDetail = {
  id: "delivery", channel: "didi", deliveryReference: "APP-42", orderName: "Ana", ticketNumber: 42,
  createdAt: new Date("2026-08-01T15:00:00Z"), confirmedAt: new Date("2026-08-01T17:00:00Z"),
  total: 5000, isVoided: false, voidedAt: null,
  payments: [{ id: "payment", method: "platform", amount: 5000, cashReceived: null, createdAt: new Date("2026-08-01T17:00:00Z") }],
  items: [{ id: "item", productId: "coffee", productName: "Café", categoryId: "drinks", quantity: 2, unitPrice: 7000, modifiers: [] }],
};

describe("delivery receipt", () => {
  // CASE: A promotional delivery amount differs from its catalog product prices.
  // VALIDATES: The receipt prints one final amount with product quantities, never invented line prices or cash.
  it("should print the manual total without catalog prices when reprinting a delivery receipt", () => {
    // Arrange
    const order = ORDER;
    // Act
    const receipt = buildReprintOrderOptions(order);
    // Assert
    expect(receipt?.total).toBe(5000);
    expect(receipt?.items).toEqual([{ name: "DiDi", quantity: 1, unitPrice: 5000, modifiers: [{ groupName: "2 x Café", optionName: null, textValue: null }] }]);
    expect(receipt?.payments).toEqual([{ method: "platform", amount: 5000, cashReceived: null }]);
    expect(receipt?.orderName).toBe("DIDI APP-42 · Ana");
  });

  // CASE: A pending delivery has preparation labels but is not yet a sale.
  // VALIDATES: A payment receipt cannot be produced before confirmation or after cancellation.
  it("should reject sale receipts when a delivery is pending or cancelled", () => {
    // Arrange
    const pending = { ...ORDER, confirmedAt: null, payments: [], total: 0 };
    // Act
    const receipt = buildReprintOrderOptions(pending);
    const voidedReceipt = buildReprintOrderOptions({ ...ORDER, isVoided: true });
    // Assert
    expect(receipt).toBeNull();
    expect(voidedReceipt).toBeNull();
  });
});
