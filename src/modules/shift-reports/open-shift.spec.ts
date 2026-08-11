import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { openShift } from "./open-shift";
import type { ShiftRepository } from "./ports";
import type { Shift } from "./shift";
import type { OrderDetail } from "./order-management";
import { ShiftAlreadyActiveError, ShiftPersistenceError } from "./errors";

function buildRepo(overrides: Partial<ShiftRepository> = {}): ShiftRepository {
  return {
    openShift: mock((openingCash: number) =>
      okAsync({
        id: "shift-1",
        openedAt: new Date(),
        closedAt: null,
        status: "active",
        openingCash,
        countedCash: null,
        cashDifference: null,
      } as Shift),
    ),
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

describe("openShift use-case", () => {
  it("creates a new shift when no active shift exists", async () => {
    const repo = buildRepo();

    const result = await openShift(repo, 10000);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.status).toBe("active");
    expect(repo.openShift).toHaveBeenCalledTimes(1);
    expect(repo.openShift).toHaveBeenCalledWith(10000);
  });

  it("rejects when an active shift already exists", async () => {
    const existingShift: Shift = {
      id: "existing",
      openedAt: new Date(),
      closedAt: null,
      status: "active",
      openingCash: 10000,
      countedCash: null,
      cashDifference: null,
    };
    const repo = buildRepo({
      getActive: mock(() => okAsync(existingShift)),
    });

    const result = await openShift(repo, 10000);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftAlreadyActiveError);
    expect(result.error.code).toBe("shiftAlreadyActive");
    expect(repo.openShift).not.toHaveBeenCalled();
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getActive: mock(() => errAsync(new ShiftPersistenceError("dbError", { context: "DB error" }) as any)),
    });

    const result = await openShift(repo, 10000);

    expect(result.isErr()).toBe(true);
  });

  it("rejects when openingCash is zero", async () => {
    const repo = buildRepo();

    const result = await openShift(repo, 0);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("invalidOpeningCash");
    expect(repo.openShift).not.toHaveBeenCalled();
  });

  it("rejects when openingCash is negative", async () => {
    const repo = buildRepo();

    const result = await openShift(repo, -1);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("invalidOpeningCash");
    expect(repo.openShift).not.toHaveBeenCalled();
  });
});