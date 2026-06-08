import { describe, expect, it, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { getShiftReport } from "./get-shift-report";
import type { ShiftRepository } from "../domain/ports";
import type { Shift, ShiftReport } from "../domain/shift";
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
    const report: ShiftReport = {
      shiftId: "shift-1",
      openedAt: new Date("2026-06-04T08:00:00.000Z"),
      closedAt: null,
      totalOrders: 10,
      totalSales: 5000,
      cashTotal: 3000,
      cardTotal: 2000,
    };
    const repo = buildRepo({
      getReport: vi.fn(() => okAsync(report)),
    });

    const result = await getShiftReport(repo, "shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(report);
    expect(repo.getReport).toHaveBeenCalledWith("shift-1");
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getReport: vi.fn(() => errAsync(new ShiftPersistenceError("DB error"))),
    });

    const result = await getShiftReport(repo, "shift-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.message).toContain("DB error");
  });
});
