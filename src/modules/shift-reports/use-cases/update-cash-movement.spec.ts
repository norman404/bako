import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { updateCashMovement } from "./update-cash-movement";
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
    addCashMovement: mock(() => okAsync({} as any)),
    updateCashMovement: mock(() =>
      okAsync({
        id: "mv-1",
        shiftId: "shift-1",
        type: "income",
        amount: 2500,
        reason: "Fondo adicional",
        createdAt: new Date(),
      } as CashMovement),
    ),
    deleteCashMovement: mock(() => okAsync(undefined)),
    listCashMovements: mock(() => okAsync([])),
    ...overrides,
  };
}

describe("updateCashMovement use-case", () => {
  it("updates amount when valid", async () => {
    const repo = buildRepo();

    const result = await updateCashMovement(repo, "mv-1", { amount: 2500 });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.amount).toBe(2500);
    expect(repo.updateCashMovement).toHaveBeenCalledWith("mv-1", { amount: 2500 });
  });

  it("updates reason when valid", async () => {
    const repo = buildRepo();

    const result = await updateCashMovement(repo, "mv-1", { reason: "Nuevo motivo" });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(repo.updateCashMovement).toHaveBeenCalledWith("mv-1", { reason: "Nuevo motivo" });
  });

  it("updates both amount and reason when valid", async () => {
    const repo = buildRepo();

    const result = await updateCashMovement(repo, "mv-1", { amount: 3000, reason: "Motivo actualizado" });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(repo.updateCashMovement).toHaveBeenCalledWith("mv-1", { amount: 3000, reason: "Motivo actualizado" });
  });

  it("rejects when amount is zero", async () => {
    const repo = buildRepo();

    const result = await updateCashMovement(repo, "mv-1", { amount: 0 });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.updateCashMovement).not.toHaveBeenCalled();
  });

  it("rejects when amount is negative", async () => {
    const repo = buildRepo();

    const result = await updateCashMovement(repo, "mv-1", { amount: -1 });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.updateCashMovement).not.toHaveBeenCalled();
  });

  it("rejects when reason is shorter than 3 chars", async () => {
    const repo = buildRepo();

    const result = await updateCashMovement(repo, "mv-1", { reason: "ab" });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("invalidCashMovement");
    expect(repo.updateCashMovement).not.toHaveBeenCalled();
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      updateCashMovement: mock(() => errAsync(new ShiftPersistenceError("cashMovementNotFound"))),
    });

    const result = await updateCashMovement(repo, "mv-1", { amount: 2500 });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("cashMovementNotFound");
  });
});