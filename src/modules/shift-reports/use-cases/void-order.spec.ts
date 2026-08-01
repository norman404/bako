import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { voidOrder } from "./void-order";
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

describe("voidOrder use-case", () => {
  it("voids an order successfully", async () => {
    const repo = buildRepo({
      voidOrder: mock(() => okAsync(undefined)),
    });

    const result = await voidOrder(repo, "order-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(repo.voidOrder).toHaveBeenCalledWith("order-1");
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      voidOrder: mock(() => errAsync(new ShiftPersistenceError("orderNotFound", { orderId: "order-1" }))),
    });

    const result = await voidOrder(repo, "order-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("orderNotFound");
  });

  it("forwards already voided error", async () => {
    const repo = buildRepo({
      voidOrder: mock(() => errAsync(new ShiftPersistenceError("orderAlreadyVoided", { orderId: "order-1" }))),
    });

    const result = await voidOrder(repo, "order-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("orderAlreadyVoided");
  });
});
