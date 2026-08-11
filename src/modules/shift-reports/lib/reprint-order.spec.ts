import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";
import { okAsync } from "neverthrow";

// Congelado ANTES de mock.module: bun parchea el namespace del módulo en vivo,
// así que sólo un spread previo conserva las implementaciones reales.
import * as checkoutModule from "@/modules/checkout";

const actualCheckout = { ...checkoutModule };

mock.module("@/modules/checkout", () => ({
  ...actualCheckout,
  printOrder: mock(() => okAsync(undefined)),
}));

import { reprintOrder } from "./reprint-order";
import { printOrder } from "@/modules/checkout";
import { buildPrinter } from "@/modules/printer/test/factories";
import type { OrderDetail } from "../order-management";

const mockedPrintOrder = printOrder as Mock<typeof printOrder>;

function buildOrderDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order-1",
    ticketNumber: 42,
    createdAt: new Date("2026-06-04T10:00:00.000Z"),
    total: 5000,
    paymentMethod: "cash",
    paymentAmount: 5000,
    fulfillmentType: null,
    customer: null,
    items: [],
    isVoided: false,
    voidedAt: null,
    ...overrides,
  };
}

describe("reprintOrder", () => {
  beforeEach(() => {
    mockedPrintOrder.mockReset();
    mockedPrintOrder.mockReturnValue(okAsync(undefined));
  });

  it("mapea OrderDetail a PrintOrderOptions y llama a printOrder con el printer recibido", async () => {
    const printer = buildPrinter({ id: "p-1", type: "network", address: "192.168.1.10:9100" });
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 2,
          unitPrice: 2000,
          modifiers: [],
        },
      ],
    });

    const result = await reprintOrder(orderDetail, printer);

    expect(result.isOk()).toBe(true);
    expect(mockedPrintOrder).toHaveBeenCalledTimes(1);
    const call = mockedPrintOrder.mock.calls[0]!;
    const [options, passedPrinter] = call;
    expect(passedPrinter).toBe(printer);
    expect(options.ticketNumber).toBe(42);
    expect(options.items).toEqual([{ name: "Taco", quantity: 2, unitPrice: 2000, modifiers: [] }]);
  });

  it("printer null → delega a printOrder con null sin romper", async () => {
    const orderDetail = buildOrderDetail();

    const result = await reprintOrder(orderDetail, null);

    expect(result.isOk()).toBe(true);
    expect(mockedPrintOrder).toHaveBeenCalledWith(expect.any(Object), null);
  });
});
