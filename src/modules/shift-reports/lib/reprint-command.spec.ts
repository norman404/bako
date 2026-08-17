import { describe, expect, it, mock, beforeEach, type Mock } from "bun:test";
import { okAsync, errAsync } from "neverthrow";

mock.module("@/modules/checkout/adapters/print-command.adapter", () => ({
  printCommand: mock(() => okAsync(undefined)),
}));

import { reprintCommand } from "./reprint-command";
import { printCommand } from "@/modules/checkout/adapters/print-command.adapter";
import { buildPrinter } from "@/modules/printer/test/factories";
import { buildCategory } from "@/modules/menu/test/factories";
import type { OrderDetail } from "@/modules/shift-reports/domain/order-management";

const mockedPrintCommand = printCommand as Mock<typeof printCommand>;

function buildOrderDetail(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: "order-1",
    ticketNumber: 42,
    createdAt: new Date("2026-06-04T10:00:00.000Z"),
    total: 5000,
    paymentMethod: "cash",
    paymentAmount: 5000,
    fulfillmentType: "local",
    customer: null,
    items: [],
    isVoided: false,
    voidedAt: null,
    ...overrides,
  };
}

const HEADER_TEXT = "COMANDA";

describe("reprintCommand", () => {
  beforeEach(() => {
    mockedPrintCommand.mockReset();
    mockedPrintCommand.mockReturnValue(okAsync(undefined));
  });

  it("item con categoría enrutada a un printer válido → imprime y no reporta errores", async () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
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

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT);

    expect(result.printedCount).toBe(2);
    expect(result.errors).toEqual([]);
    expect(mockedPrintCommand).toHaveBeenCalledTimes(2);
  });

  it("item con categoryId null → no imprime nada y no es un error", async () => {
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          productName: "Taco",
          categoryId: null,
          quantity: 1,
          unitPrice: 2000,
          modifiers: [],
        },
      ],
    });

    const result = await reprintCommand(orderDetail, [], [], HEADER_TEXT);

    expect(result.printedCount).toBe(0);
    expect(result.errors).toEqual([]);
    expect(mockedPrintCommand).not.toHaveBeenCalled();
  });

  it("un printCommand falla y el resto sigue intentándose", async () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
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
    const boom = new Error("boom");
    mockedPrintCommand.mockReturnValueOnce(errAsync(boom)).mockReturnValueOnce(okAsync(undefined));

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT);

    expect(result.printedCount).toBe(2);
    expect(result.errors).toEqual([boom]);
    expect(mockedPrintCommand).toHaveBeenCalledTimes(2);
  });

  it("todos los printCommand fallan → printedCount refleja los comandos generados y errors tiene la misma longitud", async () => {
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 3,
          unitPrice: 2000,
          modifiers: [],
        },
      ],
    });
    const boom = new Error("boom");
    mockedPrintCommand.mockReturnValue(errAsync(boom));

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT);

    expect(result.printedCount).toBe(3);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.every((error) => error === boom)).toBe(true);
  });

  it("imprime únicamente la línea seleccionada", async () => {
    // CASE: una venta tiene productos en la misma impresora y se elige solo uno.
    // VALIDATES: la reimpresión parcial nunca incluye líneas no seleccionadas.
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-taco",
          productId: "prod-taco",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 1,
          unitPrice: 2000,
          modifiers: [],
        },
        {
          id: "item-cafe",
          productId: "prod-cafe",
          productName: "Café",
          categoryId: "cat-1",
          quantity: 1,
          unitPrice: 1500,
          modifiers: [],
        },
      ],
    });

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT, [
      { orderItemId: "item-cafe", quantity: 1 },
    ]);

    expect(result.printedCount).toBe(1);
    expect(mockedPrintCommand).toHaveBeenCalledTimes(1);
    expect(mockedPrintCommand.mock.calls[0]?.[0].items[0]?.name).toBe("Café");
  });

  it("selecciona por orderItemId aunque el producto se repita con modificadores distintos", async () => {
    // CASE: dos líneas comparten productId pero representan preparaciones diferentes.
    // VALIDATES: la identidad de la línea, no la del producto, determina qué llega a cocina.
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-roja",
          productId: "prod-taco",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 1,
          unitPrice: 2000,
          modifiers: [{ groupId: "salsa", groupName: "Salsa", optionId: "roja", optionName: "Roja", textValue: null, priceDelta: 0 }],
        },
        {
          id: "item-verde",
          productId: "prod-taco",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 1,
          unitPrice: 2000,
          modifiers: [{ groupId: "salsa", groupName: "Salsa", optionId: "verde", optionName: "Verde", textValue: null, priceDelta: 0 }],
        },
      ],
    });

    await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT, [
      { orderItemId: "item-verde", quantity: 1 },
    ]);

    expect(mockedPrintCommand).toHaveBeenCalledTimes(1);
    expect(mockedPrintCommand.mock.calls[0]?.[0].items[0]?.modifiers).toEqual([
      { groupName: "Salsa", optionName: "Verde", textValue: null },
    ]);
  });

  it("respeta la cantidad parcial seleccionada", async () => {
    // CASE: se venden tres unidades y se solicitan dos para la reimpresión.
    // VALIDATES: nunca se imprimen más unidades que las seleccionadas.
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 3,
          unitPrice: 2000,
          modifiers: [],
        },
      ],
    });

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT, [
      { orderItemId: "item-1", quantity: 2 },
    ]);

    expect(result.printedCount).toBe(2);
    expect(mockedPrintCommand).toHaveBeenCalledTimes(2);
  });

  it("no imprime cuando la selección está vacía", async () => {
    // CASE: el operador abre el diálogo pero no marca ningún producto.
    // VALIDATES: una selección vacía falla cerrada y no genera una comanda completa accidental.
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 1,
          unitPrice: 2000,
          modifiers: [],
        },
      ],
    });

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT, []);

    expect(result).toEqual({ printedCount: 0, errors: [] });
    expect(mockedPrintCommand).not.toHaveBeenCalled();
  });

  it("rechaza una selección que excede la cantidad vendida sin imprimir", async () => {
    // CASE: un caller intenta pedir más unidades que las facturadas.
    // VALIDATES: el límite de cantidad se aplica también fuera de la interfaz.
    const printer = buildPrinter({ id: "p-1" });
    const categories = [buildCategory({ id: "cat-1", printerId: "p-1" })];
    const orderDetail = buildOrderDetail({
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          productName: "Taco",
          categoryId: "cat-1",
          quantity: 1,
          unitPrice: 2000,
          modifiers: [],
        },
      ],
    });

    const result = await reprintCommand(orderDetail, [printer], categories, HEADER_TEXT, [
      { orderItemId: "item-1", quantity: 2 },
    ]);

    expect(result.printedCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe("Invalid command item selection");
    expect(mockedPrintCommand).not.toHaveBeenCalled();
  });
});
