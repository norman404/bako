import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { listCashMovements } from "./list-cash-movements";
import type { ShiftRepository } from "./ports";
import type { CashMovement } from "./shift";
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

describe("listCashMovements use-case", () => {
  it("lists cash movements for a shift", async () => {
    const movements: CashMovement[] = [
      {
        id: "mv-1",
        shiftId: "shift-1",
        type: "income",
        amount: 5000,
        reason: "Fondo adicional",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
      },
      {
        id: "mv-2",
        shiftId: "shift-1",
        type: "expense",
        amount: 2000,
        reason: "Compra de bolsas",
        createdAt: new Date("2026-08-01T11:00:00.000Z"),
      },
    ];
    const repo = buildRepo({
      listCashMovements: mock(() => okAsync(movements)),
    });

    const result = await listCashMovements(repo, "shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(movements);
    expect(result.value).toHaveLength(2);
    expect(repo.listCashMovements).toHaveBeenCalledWith("shift-1");
  });

  it("returns empty list when no movements", async () => {
    const repo = buildRepo();

    const result = await listCashMovements(repo, "shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toHaveLength(0);
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      listCashMovements: mock(() => errAsync(new ShiftPersistenceError("dbError"))),
    });

    const result = await listCashMovements(repo, "shift-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error).toBeInstanceOf(ShiftPersistenceError);
    expect(result.error.code).toBe("dbError");
  });
});