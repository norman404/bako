import { describe, expect, it } from "bun:test";
import type {
  Shift,
  ShiftHistoryItem,
  ShiftReport,
  ShiftReportOrder,
  ShiftReportOrderItem,
} from "./shift";

describe("shift domain types", () => {
  it("Shift type accepts valid active shift", () => {
    const shift: Shift = {
      id: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      status: "active",
    };
    expect(shift.id).toBe("shift-1");
    expect(shift.status).toBe("active");
    expect(shift.closedAt).toBeNull();
  });

  it("Shift type accepts valid closed shift", () => {
    const shift: Shift = {
      id: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: new Date("2026-06-04T16:00:00.000Z"),
      status: "closed",
    };
    expect(shift.status).toBe("closed");
    expect(shift.closedAt).toBeInstanceOf(Date);
  });

  it("ShiftReport type has correct shape", () => {
    const orderItem: ShiftReportOrderItem = {
      productId: "product-1",
      productName: "Café con leche",
      quantity: 2,
      unitPrice: 2500,
    };
    const order: ShiftReportOrder = {
      orderId: "order-1",
      ticketNumber: 42,
      createdAt: new Date("2026-06-04T10:00:00.000Z"),
      total: 5000,
      paymentMethod: "cash",
      itemCount: 2,
      items: [orderItem],
    };
    const report: ShiftReport = {
      shiftId: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      totalOrders: 42,
      totalItems: 73,
      totalSales: 12500,
      cashTotal: 8000,
      cardTotal: 4500,
      orders: [order],
    };
    expect(report.totalOrders).toBe(42);
    expect(report.totalItems).toBe(73);
    expect(report.totalSales).toBe(12500);
    expect(report.cashTotal).toBe(8000);
    expect(report.cardTotal).toBe(4500);
    expect(report.orders).toHaveLength(1);
    expect(report.orders[0].itemCount).toBe(2);
    expect(report.orders[0].items[0].quantity).toBe(2);
  });

  it("ShiftHistoryItem type has correct shape", () => {
    const item: ShiftHistoryItem = {
      shiftId: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: new Date("2026-06-04T16:00:00.000Z"),
      totalOrders: 42,
      totalSales: 12500,
    };
    expect(item.shiftId).toBe("shift-1");
    expect(item.totalOrders).toBe(42);
  });
});
