import { describe, expect, it, mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";
import { getOrderDetail } from "./get-order-detail";
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
    ...overrides,
  };
}

describe("getOrderDetail use-case", () => {
  it("returns order detail for a valid orderId", async () => {
    const orderDetail: OrderDetail = {
      id: "order-1",
      ticketNumber: 42,
      createdAt: new Date("2026-06-04T10:00:00.000Z"),
      total: 5000,
      paymentMethod: "cash",
      paymentAmount: 5000,
      fulfillmentType: "local",
      customer: null,
      items: [
        {
          id: "item-1",
          productId: "product-1",
          productName: "Café con leche",
          categoryId: "category-1",
          quantity: 2,
          unitPrice: 2500,
          modifiers: [],
        },
      ],
      isVoided: false,
      voidedAt: null,
    };
    const repo = buildRepo({
      getOrderDetail: mock(() => okAsync(orderDetail)),
    });

    const result = await getOrderDetail(repo, "order-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual(orderDetail);
    expect(result.value.ticketNumber).toBe(42);
    expect(result.value.items).toHaveLength(1);
    expect(repo.getOrderDetail).toHaveBeenCalledWith("order-1");
  });

  it("forwards repository errors", async () => {
    const repo = buildRepo({
      getOrderDetail: mock(() => errAsync(new ShiftPersistenceError("orderNotFound", { orderId: "order-1" }))),
    });

    const result = await getOrderDetail(repo, "order-1");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected error");
    expect(result.error.code).toBe("orderNotFound");
  });
});
