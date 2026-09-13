import { describe, expect, it } from "vitest";

import { aggregateSalesMetrics } from "./metrics";

describe("aggregateSalesMetrics", () => {
  it("aggregates sales and top products while preserving empty days", () => {
    const range = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 4) };
    const result = aggregateSalesMetrics(
      range,
      [
        { channel: "local", id: "order-1", total: 3000, createdAt: new Date(2026, 7, 1, 12) },
        { channel: "local", id: "order-2", total: 1500, createdAt: new Date(2026, 7, 3, 12) },
      ],
      [
        { orderId: "order-1", productId: "burger", productName: "Burger", quantity: 2, unitPrice: 1000 },
        { orderId: "order-1", productId: "soda", productName: "Soda", quantity: 1, unitPrice: 1000 },
        { orderId: "order-2", productId: "burger", productName: "Burger", quantity: 3, unitPrice: 500 },
      ],
    );

    expect(result.sales).toBe(4500);
    expect(result.series).toEqual([
      { date: "2026-08-01", sales: 3000 },
      { date: "2026-08-02", sales: 0 },
      { date: "2026-08-03", sales: 1500 },
    ]);
    expect(result.products).toEqual([
      { productId: "burger", productName: "Burger", sales: 3500, items: 5 },
      { productId: "soda", productName: "Soda", sales: 1000, items: 1 },
    ]);
  });

  it("returns zero metrics for an empty range", () => {
    const range = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 2) };
    const empty = aggregateSalesMetrics(range, [], []);
    expect(empty.sales).toBe(0);
    expect(empty.products).toEqual([]);
    expect(empty.payments).toEqual([]);
  });

  it("calculates payments and hourly peaks", () => {
    const range = { start: new Date(2026, 7, 3), end: new Date(2026, 7, 4) };
    const result = aggregateSalesMetrics(
      range,
      [{ channel: "local", id: "current", total: 1000, createdAt: new Date(2026, 7, 3, 9) }],
      [{ orderId: "current", productId: "coffee", productName: "Coffee", quantity: 2, unitPrice: 500 }],
      [{ method: "cash", amount: 600 }, { method: "card", amount: 400 }],
    );

    expect(result.payments).toEqual([
      { method: "cash", amount: 600, percentage: 0.6 },
      { method: "card", amount: 400, percentage: 0.4 },
    ]);
    expect(result.hourlySales[9]).toBe(1000);
  });
});

// CASE: The manual DiDi total is $50 although its catalog products total $140.
// VALIDATES: Revenue uses $50 and the top-products list does not invent delivery allocations.
it("should use the manual delivery total when aggregating revenue by channel", () => {
  // Arrange
  const range = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 2) };
  const orders = [
    { id: "local", channel: "local", total: 7000, createdAt: new Date(2026, 7, 1, 10) },
    { id: "delivery", channel: "didi", total: 5000, createdAt: new Date(2026, 7, 1, 17) },
  ];
  const item = { productId: "coffee", productName: "Coffee", quantity: 1, unitPrice: 7000 };
  // Act
  const result = aggregateSalesMetrics(range, orders, [{ ...item, orderId: "local" }, { ...item, orderId: "delivery", quantity: 2 }], [{ method: "cash", amount: 7000 }, { method: "platform", amount: 5000 }]);
  // Assert
  expect(result.sales).toBe(12000);
  expect(result.products).toEqual([{ productId: "coffee", productName: "Coffee", sales: 7000, items: 1 }]);
  expect(result.hourlySales[17]).toBe(5000);
});

// CASE: An app collection is persisted as zero and must not surface as a payment method.
// VALIDATES: Zero-amount payments are excluded from the payment breakdown.
it("should exclude zero-amount payments from the payment breakdown", () => {
  // Arrange
  const range = { start: new Date(2026, 7, 3), end: new Date(2026, 7, 4) };
  // Act
  const result = aggregateSalesMetrics(range, [], [], [{ method: "cash", amount: 7000 }, { method: "platform", amount: 0 }]);
  // Assert
  expect(result.payments).toEqual([{ method: "cash", amount: 7000, percentage: 1 }]);
});
