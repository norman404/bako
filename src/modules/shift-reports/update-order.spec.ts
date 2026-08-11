import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { updateOrder } from "./update-order";
import type { ShiftRepository } from "./ports";
import type { Shift } from "./shift";
import type { OrderDetail, UpdateOrderInput } from "./order-management";
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

describe("updateOrder use-case", () => {
  it("updates an order successfully", async () => {
    const input: UpdateOrderInput = {
      items: [
        {
          productId: "product-1",
          quantity: 3,
          unitPrice: 2500,
          modifiers: [],
        },
      ],
      payment: {
        method: "cash",
        amount: 7500,
      },
    };

    const updated: OrderDetail = {
      id: "order-1",
      ticketNumber: 42,
      createdAt: new Date("2026-06-04T10:00:00.000Z"),
      total: 7500,
      paymentMethod: "cash",
      paymentAmount: 7500,
      fulfillmentType: "local",
      customer: null,
      items: [
        {
          id: "item-1",
          productId: "product-1",
          productName: "Café con leche",
          categoryId: "category-1",
          quantity: 3,
          unitPrice: 2500,
          modifiers: [],
        },
      ],
      isVoided: false,
      voidedAt: null,
    };

    const repo = buildRepo({
      updateOrder: mock(() => okAsync(updated)),
    });

    const result = await updateOrder(repo, "order-1", input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(updated);
    expect(result.value.total).toBe(7500);
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0].quantity).toBe(3);
    expect(repo.updateOrder).toHaveBeenCalledWith("order-1", input);
  });

  it("forwards repository errors", async () => {
    const input: UpdateOrderInput = {
      items: [],
      payment: { method: "cash", amount: 0 },
    };
    const repo = buildRepo({
      updateOrder: mock(() => errAsync(new ShiftPersistenceError("orderNotFound", { orderId: "order-1" }))),
    });

    const result = await updateOrder(repo, "order-1", input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("orderNotFound");
  });
});
