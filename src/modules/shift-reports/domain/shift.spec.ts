import { describe, expect, it } from "vitest";
import type { Shift, ShiftHistoryItem, ShiftReport } from "./shift";

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
    const report: ShiftReport = {
      shiftId: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      totalOrders: 42,
      totalSales: 12500,
      cashTotal: 8000,
      cardTotal: 4500,
    };
    expect(report.totalOrders).toBe(42);
    expect(report.totalSales).toBe(12500);
    expect(report.cashTotal).toBe(8000);
    expect(report.cardTotal).toBe(4500);
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
