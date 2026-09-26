import { describe, expect, it } from "vitest";

import { aggregatePromotions } from "./promotion-summary";

describe("aggregatePromotions", () => {
  // CASE: A shift had two 2x1 sales, one bundle and a cancelled 2x1 sale.
  // VALIDATES: The cut counts each application and its discount, ignoring voided and pending orders.
  it("should total promotion discounts only for counted sales", () => {
    // Arrange
    const orders = [
      { orderId: "a", isVoided: false, isPending: false },
      { orderId: "b", isVoided: false, isPending: false },
      { orderId: "voided", isVoided: true, isPending: false },
    ];
    const rows = [
      { orderId: "a", promotionId: "p1", kind: "nxm", name: "2x1 Latte", discountAmount: 5_000 },
      { orderId: "a", promotionId: "p1", kind: "nxm", name: "2x1 Latte", discountAmount: 5_000 },
      { orderId: "b", promotionId: "p1", kind: "nxm", name: "2x1 Latte (renombrada)", discountAmount: 4_000 },
      { orderId: "b", promotionId: null, kind: "composite", name: "Paquete tarde", discountAmount: 2_000 },
      { orderId: "voided", promotionId: "p1", kind: "nxm", name: "2x1 Latte", discountAmount: 5_000 },
    ];

    // Act
    const summary = aggregatePromotions(rows, orders);

    // Assert
    expect(summary).toEqual([
      { promotionId: "p1", kind: "nxm", name: "2x1 Latte", timesApplied: 3, discountTotal: 14_000 },
      { promotionId: null, kind: "composite", name: "Paquete tarde", timesApplied: 1, discountTotal: 2_000 },
    ]);
  });
});
