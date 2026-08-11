import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { deleteCashMovement } from "./delete-cash-movement";
import type { ShiftRepository } from "./ports";
import type { Shift } from "./shift";
import type { OrderDetail } from "./order-management";
import { ShiftPersistenceError } from "./errors";

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

describe("deleteCashMovement use-case", () => {
  it("deletes a cash movement", async () => {
    const repo = buildRepo();

    const result = await deleteCashMovement(repo, "mv-1");

    expect(result.isOk()).toBe(true);
    expect(repo.deleteCashMovement).toHaveBeenCalledWith("mv-1");
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      deleteCashMovement: mock(() => errAsync(new ShiftPersistenceError("cashMovementNotFound"))),
    });

    const result = await deleteCashMovement(repo, "mv-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("cashMovementNotFound");
  });
});