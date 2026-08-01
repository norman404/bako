import { describe, expect, it } from "bun:test";
import type {
  CashMovement,
  CashMovementInput,
  CashMovementType,
  Shift,
  ShiftHistoryItem,
  ShiftReport,
  ShiftReportOrder,
  ShiftReportOrderItem,
  UpdateCashMovementInput,
} from "./shift";

describe("shift domain types", () => {
  it("Shift type accepts valid active shift", () => {
    const shift: Shift = {
      id: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      status: "active",
      openingCash: 10000,
      countedCash: null,
      cashDifference: null,
    };
    expect(shift.id).toBe("shift-1");
    expect(shift.status).toBe("active");
    expect(shift.closedAt).toBeNull();
    expect(shift.openingCash).toBe(10000);
    expect(shift.countedCash).toBeNull();
    expect(shift.cashDifference).toBeNull();
  });

  it("Shift type accepts valid closed shift", () => {
    const shift: Shift = {
      id: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: new Date("2026-06-04T16:00:00.000Z"),
      status: "closed",
      openingCash: 10000,
      countedCash: 16000,
      cashDifference: 0,
    };
    expect(shift.status).toBe("closed");
    expect(shift.closedAt).toBeInstanceOf(Date);
    expect(shift.countedCash).toBe(16000);
    expect(shift.cashDifference).toBe(0);
  });

  it("Shift type accepts legacy shift with zero opening cash", () => {
    const shift: Shift = {
      id: "shift-legacy",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: new Date("2026-06-04T16:00:00.000Z"),
      status: "closed",
      openingCash: 0,
      countedCash: null,
      cashDifference: null,
    };
    expect(shift.openingCash).toBe(0);
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
      isVoided: false,
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
      openingCash: 10000,
      cashMovementsIn: 2000,
      cashMovementsOut: 1000,
      expectedCash: 19000,
      countedCash: null,
      cashDifference: null,
      cashMovements: [],
    };
    expect(report.totalOrders).toBe(42);
    expect(report.totalItems).toBe(73);
    expect(report.totalSales).toBe(12500);
    expect(report.cashTotal).toBe(8000);
    expect(report.cardTotal).toBe(4500);
    expect(report.openingCash).toBe(10000);
    expect(report.cashMovementsIn).toBe(2000);
    expect(report.cashMovementsOut).toBe(1000);
    expect(report.expectedCash).toBe(19000);
    expect(report.countedCash).toBeNull();
    expect(report.cashDifference).toBeNull();
    expect(report.cashMovements).toEqual([]);
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
      openingCash: 10000,
      cashDifference: 0,
    };
    expect(item.shiftId).toBe("shift-1");
    expect(item.totalOrders).toBe(42);
    expect(item.openingCash).toBe(10000);
    expect(item.cashDifference).toBe(0);
  });

  it("ShiftHistoryItem accepts null cashDifference for open shift", () => {
    const item: ShiftHistoryItem = {
      shiftId: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      totalOrders: 0,
      totalSales: 0,
      openingCash: 5000,
      cashDifference: null,
    };
    expect(item.cashDifference).toBeNull();
  });
});

describe("cash movement domain types", () => {
  it("CashMovementType accepts income and expense", () => {
    const income: CashMovementType = "income";
    const expense: CashMovementType = "expense";
    expect(income).toBe("income");
    expect(expense).toBe("expense");
  });

  it("CashMovement type accepts valid income movement", () => {
    const movement: CashMovement = {
      id: "mv-1",
      shiftId: "shift-1",
      type: "income",
      amount: 5000,
      reason: "Fondo adicional",
      createdAt: new Date("2026-06-04T10:00:00.000Z"),
    };
    expect(movement.id).toBe("mv-1");
    expect(movement.type).toBe("income");
    expect(movement.amount).toBe(5000);
    expect(movement.reason).toBe("Fondo adicional");
    expect(movement.createdAt).toBeInstanceOf(Date);
  });

  it("CashMovement type accepts valid expense movement", () => {
    const movement: CashMovement = {
      id: "mv-2",
      shiftId: "shift-1",
      type: "expense",
      amount: 2000,
      reason: "Compra de bolsas",
      createdAt: new Date("2026-06-04T11:00:00.000Z"),
    };
    expect(movement.type).toBe("expense");
    expect(movement.amount).toBe(2000);
  });

  it("CashMovementInput type accepts valid input", () => {
    const input: CashMovementInput = {
      type: "income",
      amount: 3000,
      reason: "Cambio inicial",
    };
    expect(input.type).toBe("income");
    expect(input.amount).toBe(3000);
    expect(input.reason).toBe("Cambio inicial");
  });

  it("UpdateCashMovementInput accepts partial updates", () => {
    const amountOnly: UpdateCashMovementInput = { amount: 4500 };
    expect(amountOnly.amount).toBe(4500);
    expect(amountOnly.reason).toBeUndefined();

    const reasonOnly: UpdateCashMovementInput = { reason: "Nuevo motivo" };
    expect(reasonOnly.reason).toBe("Nuevo motivo");
    expect(reasonOnly.amount).toBeUndefined();

    const both: UpdateCashMovementInput = { amount: 5000, reason: "Updated" };
    expect(both.amount).toBe(5000);
    expect(both.reason).toBe("Updated");

    const empty: UpdateCashMovementInput = {};
    expect(empty).toEqual({});
  });
});
