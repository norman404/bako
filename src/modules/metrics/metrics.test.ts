import { describe, expect, it } from "vitest";

import { aggregateSalesMetrics } from "./metrics";

describe("aggregateSalesMetrics", () => {
  it("aggregates sales, products and categories while preserving empty days", () => {
    const range = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 4) };
    const result = aggregateSalesMetrics(
      range,
      [
        { id: "order-1", total: 3000, createdAt: new Date(2026, 7, 1, 12) },
        { id: "order-2", total: 1500, createdAt: new Date(2026, 7, 3, 12) },
      ],
      [
        { orderId: "order-1", productId: "burger", productName: "Burger", quantity: 2, unitPrice: 1000, unitCost: 400, categoryId: "food", categoryName: "Comida" },
        { orderId: "order-1", productId: "soda", productName: "Soda", quantity: 1, unitPrice: 1000, unitCost: 200, categoryId: "drinks", categoryName: "Bebidas" },
        { orderId: "order-2", productId: "burger", productName: "Burger", quantity: 3, unitPrice: 500, unitCost: 300, categoryId: "food", categoryName: "Comida" },
      ],
    );

    expect(result.sales).toBe(4500);
    expect(result.totalItems).toBe(6);
    expect(result.averageTicket).toBe(2250);
    expect(result.series).toEqual([
      { date: "2026-08-01", sales: 3000, items: 3, orders: 1 },
      { date: "2026-08-02", sales: 0, items: 0, orders: 0 },
      { date: "2026-08-03", sales: 1500, items: 3, orders: 1 },
    ]);
    expect(result.categories[0]).toEqual({ categoryId: "food", categoryName: "Comida", sales: 3500, items: 5, profit: 1800 });
  });

  it("returns zero metrics and combines missing categories", () => {
    const range = { start: new Date(2026, 7, 1), end: new Date(2026, 7, 2) };
    const empty = aggregateSalesMetrics(range, [], []);
    expect(empty.averageTicket).toBe(0);
    expect(empty.categories).toEqual([]);

    const result = aggregateSalesMetrics(range, [{ id: "order", total: 500, createdAt: new Date(2026, 7, 1) }], [
      { orderId: "order", productId: "deleted", productName: "Deleted", quantity: 1, unitPrice: 500, unitCost: 100, categoryId: "deleted", categoryName: null },
    ]);
    expect(result.categories).toEqual([{ categoryId: null, categoryName: null, sales: 500, items: 1, profit: 400 }]);
  });

  it("calculates comparison, payments, peaks, shifts, voids and profitability", () => {
    const range = { start: new Date(2026, 7, 3), end: new Date(2026, 7, 4) };
    const item = { orderId: "current", productId: "coffee", productName: "Coffee", quantity: 2, unitPrice: 500, unitCost: 200, categoryId: "drinks", categoryName: "Drinks" };
    const result = aggregateSalesMetrics(
      range,
      [{ id: "current", total: 1000, createdAt: new Date(2026, 7, 3, 9), shiftId: "shift" }],
      [item],
      [{ id: "previous", total: 500, createdAt: new Date(2026, 7, 2, 9) }],
      [{ ...item, orderId: "previous", quantity: 1 }],
      [{ method: "cash", amount: 600 }, { method: "card", amount: 400 }],
      [{ id: "void", total: 300, createdAt: new Date(2026, 7, 3, 10) }],
      [{ id: "shift", openedAt: new Date(2026, 7, 3, 8), closedAt: new Date(2026, 7, 3, 16), cashDifference: -50 }],
    );

    expect(result).toMatchObject({ cost: 400, profit: 600, margin: 0.6 });
    expect(result.previous.sales).toBe(500);
    expect(result.payments).toEqual([
      { method: "cash", amount: 600, percentage: 0.6 },
      { method: "card", amount: 400, percentage: 0.4 },
    ]);
    expect(result.hourlySales[9]).toBe(1000);
    expect(result.weekdaySales[1]).toBe(1000);
    expect(result.shifts).toEqual({ count: 1, averageSales: 1000, averageDurationMinutes: 480, cashDifference: -50 });
    expect(result.voids).toEqual({ count: 1, amount: 300, rate: 0.5 });
  });
});
