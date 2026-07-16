import { describe, expect, it, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { getShiftReport } from "./get-shift-report";
import type { ShiftRepository } from "../domain/ports";
import type { Shift, ShiftReport, ShiftReportOrder } from "../domain/shift";
import { ShiftPersistenceError } from "../domain/errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: vi.fn(() => okAsync({} as Shift)),
    closeShift: vi.fn(() => okAsync({} as Shift)),
    getActive: vi.fn(() => okAsync(null)),
    listHistory: vi.fn(() => okAsync([])),
    getReport: vi.fn(() => okAsync({} as any)),
    ...overrides,
  };
}

describe("getShiftReport use-case", () => {
  it("returns report for a shift", async () => {
    const order: ShiftReportOrder = {
      orderId: "order-1",
      ticketNumber: 1,
      createdAt: new Date("2026-06-04T10:00:00.000Z"),
      total: 5000,
      paymentMethod: "cash",
      itemCount: 3,
      items: [
        {
          productId: "product-1",
          productName: "Café con leche",
          quantity: 2,
          unitPrice: 2500,
        },
      ],
    };
    const report: ShiftReport = {
      shiftId: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      totalOrders: 10,
      totalItems: 25,
      totalSales: 5000,
      cashTotal: 3000,
      cardTotal: 2000,
      orders: [order],
    };
    const repo = buildRepo({
      getReport: vi.fn(() => okAsync(report)),
    });

    const result = await getShiftReport(repo, "shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(report);
    expect(result.value.totalItems).toBe(25);
    expect(result.value.orders).toHaveLength(1);
    expect(repo.getReport).toHaveBeenCalledWith("shift-1");
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getReport: vi.fn(() => errAsync(new ShiftPersistenceError("dbError", { context: "DB error" }))),
    });

    const result = await getShiftReport(repo, "shift-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("dbError");
  });
});
