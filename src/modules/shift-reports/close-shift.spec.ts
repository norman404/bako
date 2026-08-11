import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { closeShift } from "./close-shift";
import type { ShiftRepository } from "./ports";
import type { Shift } from "./shift";
import type { OrderDetail } from "./order-management";
import { NoActiveShiftError, ShiftPersistenceError } from "./errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: mock(() => okAsync({} as Shift)),
    closeShift: mock((shiftId: string, countedCash: number) =>
      okAsync({
        id: shiftId,
        openedAt: new Date(),
        closedAt: new Date(),
        status: "closed",
        openingCash: 10000,
        countedCash,
        cashDifference: 0,
      } as Shift),
    ),
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

describe("closeShift use-case", () => {
  it("closes the given shift", async () => {
    const repo = buildRepo();

    const result = await closeShift(repo, "shift-1", 20000);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.status).toBe("closed");
    expect(repo.closeShift).toHaveBeenCalledWith("shift-1", 20000);
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      closeShift: mock(() => errAsync(new NoActiveShiftError())),
    });

    const result = await closeShift(repo, "shift-1", 20000);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(NoActiveShiftError);
    expect(result.error.code).toBe("noActiveShift");
  });

  it("rejects when countedCash is negative", async () => {
    const repo = buildRepo();

    const result = await closeShift(repo, "shift-1", -1);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("invalidCountedCash");
    expect(repo.closeShift).not.toHaveBeenCalled();
  });
});