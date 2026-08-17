import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { getActiveShift } from "./get-active-shift";
import type { ShiftRepository } from "../domain/ports";
import type { Shift } from "../domain/shift";
import type { OrderDetail } from "../domain/order-management";
import { ShiftPersistenceError } from "../domain/errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: mock(() => okAsync({} as Shift)),
    closeShift: mock(() => okAsync({} as Shift)),
    getActive: mock(() => okAsync(null)),
    listHistory: mock(() => okAsync([])),
    getReport: mock(() => okAsync({} as any)),
    getOrderDetail: mock(() => okAsync({} as OrderDetail)),
    voidOrder: mock(() => okAsync(undefined)),
    updateOrder: mock(() => okAsync({} as OrderDetail)),
    addCashMovement: mock(() => okAsync({} as any)),
    updateCashMovement: mock(() => okAsync({} as any)),
    deleteCashMovement: mock(() => okAsync(undefined)),
    listCashMovements: mock(() => okAsync([])),
    ...overrides,
  };
}

describe("getActiveShift use-case", () => {
  it("returns null when no active shift", async () => {
    const repo = buildRepo();

    const result = await getActiveShift(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toBeNull();
  });

  it("returns the active shift", async () => {
    const active: Shift = {
      id: "shift-1",
      openedAt: new Date(),
      closedAt: null,
      status: "active",
      openingCash: 10000,
      countedCash: null,
      cashDifference: null,
    };
    const repo = buildRepo({
      getActive: mock(() => okAsync(active)),
    });

    const result = await getActiveShift(repo);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(active);
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getActive: mock(() => errAsync(new ShiftPersistenceError("dbError", { context: "DB error" }))),
    });

    const result = await getActiveShift(repo);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("dbError");
  });
});
