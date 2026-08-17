import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { addCashMovement } from "./add-cash-movement";
import type { ShiftRepository } from "../domain/ports";
import type { CashMovement } from "../domain/shift";
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
    addCashMovement: mock(() =>
      okAsync({
        id: "mv-1",
        shiftId: "shift-1",
        type: "income",
        amount: 5000,
        reason: "Fondo adicional",
        createdAt: new Date(),
      } as CashMovement),
    ),
    updateCashMovement: mock(() => okAsync({} as any)),
    deleteCashMovement: mock(() => okAsync(undefined)),
    listCashMovements: mock(() => okAsync([])),
    ...overrides,
  };
}

describe("addCashMovement use-case", () => {
  it("creates a cash movement with valid input", async () => {
    const repo = buildRepo();

    const result = await addCashMovement(repo, "shift-1", {
      type: "income",
      amount: 5000,
      reason: "Fondo adicional",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.type).toBe("income");
    expect(result.value.amount).toBe(5000);
    expect(repo.addCashMovement).toHaveBeenCalledWith("shift-1", {
      type: "income",
      amount: 5000,
      reason: "Fondo adicional",
    });
  });

  it("creates an expense movement with valid input", async () => {
    const repo = buildRepo();

    const result = await addCashMovement(repo, "shift-1", {
      type: "expense",
      amount: 2000,
      reason: "Compra de bolsas",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(repo.addCashMovement).toHaveBeenCalledWith("shift-1", {
      type: "expense",
      amount: 2000,
      reason: "Compra de bolsas",
    });
  });

  it("rejects when amount is zero", async () => {
    const repo = buildRepo();

    const result = await addCashMovement(repo, "shift-1", {
      type: "income",
      amount: 0,
      reason: "Fondo adicional",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.addCashMovement).not.toHaveBeenCalled();
  });

  it("rejects when amount is negative", async () => {
    const repo = buildRepo();

    const result = await addCashMovement(repo, "shift-1", {
      type: "income",
      amount: -1,
      reason: "Fondo adicional",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.addCashMovement).not.toHaveBeenCalled();
  });

  it("rejects when reason is shorter than 3 characters", async () => {
    const repo = buildRepo();

    const result = await addCashMovement(repo, "shift-1", {
      type: "income",
      amount: 5000,
      reason: "ab",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.addCashMovement).not.toHaveBeenCalled();
  });

  it("rejects when reason is empty", async () => {
    const repo = buildRepo();

    const result = await addCashMovement(repo, "shift-1", {
      type: "income",
      amount: 5000,
      reason: "",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.addCashMovement).not.toHaveBeenCalled();
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      addCashMovement: mock(() => errAsync(new ShiftPersistenceError("dbError"))),
    });

    const result = await addCashMovement(repo, "shift-1", {
      type: "income",
      amount: 5000,
      reason: "Fondo adicional",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("dbError");
  });
});