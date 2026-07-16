import { describe, expect, it, vi } from "vitest";
import { okAsync, errAsync } from "neverthrow";
import { listShiftHistory } from "./list-shift-history";
import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import type { ShiftHistoryItem } from "../domain/shift";
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

describe("listShiftHistory use-case", () => {
  it("returns empty list when no shifts", async () => {
    const repo = buildRepo();

    const result = await listShiftHistory(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toHaveLength(0);
  });

  it("returns shifts with aggregated data", async () => {
    const history: ShiftHistoryItem[] = [
      {
        shiftId: "shift-1",
        openedAt: new Date("2026-06-04T08:00:00.000Z"),
        closedAt: new Date("2026-06-04T16:00:00.000Z"),
        totalOrders: 5,
        totalSales: 12500,
      },
    ];
    const repo = buildRepo({
      listHistory: vi.fn(() => okAsync(history)),
    });

    const result = await listShiftHistory(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(history);
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      listHistory: vi.fn(() => errAsync(new ShiftPersistenceError("dbError", { context: "DB error" }))),
    });

    const result = await listShiftHistory(repo);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("dbError");
  });
});
