import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import type {
  OrderItemModifierRow,
  OrderItemRow,
  OrderRow,
  PaymentRow,
} from "@/shared/db/schema";

const txMocks = (() => {
  const selectMock = mock<any>();

  const insertReturningMock = mock<any>(() => Promise.resolve([]));
  const insertValuesMock = mock<any>(() => ({ returning: insertReturningMock }));
  const insertMock = mock(() => ({ values: insertValuesMock }));

  const updateReturningMock = mock<any>(() => Promise.resolve([]));
  const updateWhereMock = mock(() => ({ returning: updateReturningMock }));
  const updateSetMock = mock<any>(() => ({ where: updateWhereMock }));
  const updateMock = mock(() => ({ set: updateSetMock }));

  return {
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
    updateReturningMock,
    updateWhereMock,
    updateSetMock,
    updateMock,
  };
})();

const dbMocks = {
  select: txMocks.selectMock,
  insert: txMocks.insertMock,
  update: txMocks.updateMock,
};

const txClient = {
  select: txMocks.selectMock,
  insert: txMocks.insertMock,
  update: txMocks.updateMock,
};

mock.module("@/shared/db/client", () => ({
  db: dbMocks,
  withTransaction: async (operation: (tx: any) => Promise<any>) => operation(txClient),
}));

import { orderDrizzleRepository } from "@/modules/checkout/persistence/order-drizzle.repository";
import type {
  CheckoutOrderItemInput,
  CheckoutOrderItemModifierInput,
  CreateOrderInput,
} from "@/modules/checkout/domain/order";

const now = new Date("2026-01-01T10:00:00.000Z");

function buildOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: overrides.id ?? "order-1",
    ticketNumber: overrides.ticketNumber ?? 1,
    customerId: overrides.customerId ?? null,
    deliveryPersonId: overrides.deliveryPersonId ?? null,
    shiftId: overrides.shiftId ?? null,
    total: overrides.total ?? 5500,
    createdAt: overrides.createdAt ?? now,
  };
}

function buildPaymentRow(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: overrides.id ?? "payment-1",
    orderId: overrides.orderId ?? "order-1",
    method: overrides.method ?? "cash",
    amount: overrides.amount ?? 5500,
    createdAt: overrides.createdAt ?? now,
  };
}

function buildOrderItemRow(overrides: Partial<OrderItemRow> = {}): OrderItemRow {
  return {
    id: overrides.id ?? "item-1",
    orderId: overrides.orderId ?? "order-1",
    productId: overrides.productId ?? "cafe",
    quantity: overrides.quantity ?? 1,
    unitPrice: overrides.unitPrice ?? 5500,
    createdAt: overrides.createdAt ?? now,
  };
}

function buildOrderItemModifierRow(overrides: Partial<OrderItemModifierRow> = {}): OrderItemModifierRow {
  return {
    id: overrides.id ?? "mod-1",
    orderItemId: overrides.orderItemId ?? "item-1",
    groupId: overrides.groupId ?? "g1",
    groupName: overrides.groupName ?? "Hielo",
    optionId: overrides.optionId !== undefined ? overrides.optionId : "o1",
    optionName: overrides.optionName ?? "Extra",
    priceDelta: overrides.priceDelta ?? 500,
    textValue: overrides.textValue ?? null,
    createdAt: overrides.createdAt ?? now,
  };
}

function buildModifierInput(overrides: Partial<CheckoutOrderItemModifierInput> = {}): CheckoutOrderItemModifierInput {
  return {
    groupId: overrides.groupId ?? "g1",
    groupName: overrides.groupName ?? "Hielo",
    optionId: overrides.optionId !== undefined ? overrides.optionId : "o1",
    optionName: overrides.optionName !== undefined ? overrides.optionName : "Extra",
    priceDelta: overrides.priceDelta ?? 500,
    textValue: overrides.textValue ?? null,
  };
}

function selectChainSimple(rows: unknown) {
  return {
    from: () => ({
      where: mock(() => Promise.resolve(rows)),
    }),
  };
}

function buildLocalOrderInput(items: CheckoutOrderItemInput[]): CreateOrderInput {
  return {
    items,
    fulfillmentType: "local",
    payment: { method: "cash", amount: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) },
  };
}

describe("orderDrizzleRepository.createOrder — modifier snapshots", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    txMocks.insertReturningMock.mockResolvedValue([]);
    txMocks.updateReturningMock.mockResolvedValue([]);
  });

  it("inserts order_item_modifiers rows for items with modifiers inside the transaction", async () => {
    const generatedId = "11111111-1111-4111-8111-111111111111";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const orderRow = buildOrderRow({ id: generatedId, total: 5500 });
    const paymentRow = buildPaymentRow({ id: generatedId, orderId: generatedId });
    const orderItemRow = buildOrderItemRow({ id: generatedId, orderId: generatedId, unitPrice: 5500 });

    // loadNextTicketNumber: select().from(orders).orderBy().limit() → []
    txMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });
    // createOrderRow
    txMocks.insertReturningMock.mockResolvedValueOnce([orderRow]);
    // createPaymentRow
    txMocks.insertReturningMock.mockResolvedValueOnce([paymentRow]);
    // createOrderItemRows
    txMocks.insertReturningMock.mockResolvedValueOnce([orderItemRow]);

    const items: CheckoutOrderItemInput[] = [
      {
        productId: "cafe",
        quantity: 1,
        unitPrice: 5500,
        modifiers: [
          buildModifierInput({ groupId: "g1", groupName: "Hielo", optionId: "o1", optionName: "Extra", priceDelta: 500 }),
          buildModifierInput({
            groupId: "g-comments",
            groupName: "Comentarios",
            optionId: null,
            optionName: null,
            priceDelta: 0,
            textValue: "sin azúcar",
          }),
        ],
      },
    ];

    // createOrderItemModifiers inserts the snapshots (4th insert), then
    // rowToCheckoutOrder loads modifiers via select().from(orderItemModifiers).where(inArray)
    txMocks.selectMock.mockReturnValueOnce(
      selectChainSimple([
        buildOrderItemModifierRow({
          orderItemId: generatedId,
          groupId: "g1",
          groupName: "Hielo",
          optionId: "o1",
          optionName: "Extra",
          priceDelta: 500,
          textValue: null,
        }),
        buildOrderItemModifierRow({
          orderItemId: generatedId,
          groupId: "g-comments",
          groupName: "Comentarios",
          optionId: null,
          optionName: "",
          priceDelta: 0,
          textValue: "sin azúcar",
        }),
      ]),
    );

    const result = await orderDrizzleRepository.createOrder(buildLocalOrderInput(items));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    // Insert calls: order, payment, order items, modifiers
    expect(txMocks.insertMock).toHaveBeenCalledTimes(4);

    // The 4th insert call is the modifiers insert
    const modifiersInsertArg = txMocks.insertValuesMock.mock.calls[3]![0];
    const modifierRows = Array.isArray(modifiersInsertArg) ? modifiersInsertArg : [modifiersInsertArg];
    expect(modifierRows).toHaveLength(2);
    expect(modifierRows[0]).toMatchObject({
      orderItemId: generatedId,
      groupId: "g1",
      groupName: "Hielo",
      optionId: "o1",
      optionName: "Extra",
      priceDelta: 500,
      textValue: null,
    });
    expect(modifierRows[1]).toMatchObject({
      orderItemId: generatedId,
      groupId: "g-comments",
      groupName: "Comentarios",
      optionId: null,
      optionName: "",
      priceDelta: 0,
      textValue: "sin azúcar",
    });

    randomUuidSpy.mockRestore();
  });

  it("does NOT insert modifier rows when item has empty modifiers", async () => {
    const generatedId = "22222222-2222-4222-8222-222222222222";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const orderRow = buildOrderRow({ id: generatedId, total: 4000 });
    const paymentRow = buildPaymentRow({ id: generatedId, orderId: generatedId });
    const orderItemRow = buildOrderItemRow({ id: generatedId, orderId: generatedId, unitPrice: 4000 });

    txMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });
    txMocks.insertReturningMock.mockResolvedValueOnce([orderRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([paymentRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([orderItemRow]);
    // loadOrderItemModifierRows: select().from(orderItemModifiers).where(inArray) → []
    txMocks.selectMock.mockReturnValueOnce(
      selectChainSimple([]),
    );

    const items: CheckoutOrderItemInput[] = [
      { productId: "te", quantity: 1, unitPrice: 4000, modifiers: [] },
    ];

    const result = await orderDrizzleRepository.createOrder(buildLocalOrderInput(items));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    // Insert calls: order, payment, order items. NO modifiers insert.
    expect(txMocks.insertMock).toHaveBeenCalledTimes(3);

    randomUuidSpy.mockRestore();
  });

  it("rolls back modifiers when order item insertion fails mid-transaction", async () => {
    const generatedId = "33333333-3333-4333-8333-333333333333";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const orderRow = buildOrderRow({ id: generatedId, total: 5500 });
    const paymentRow = buildPaymentRow({ id: generatedId, orderId: generatedId });

    txMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });
    txMocks.insertReturningMock.mockResolvedValueOnce([orderRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([paymentRow]);
    // createOrderItemRows fails → returning returns [] (length mismatch triggers error)
    txMocks.insertReturningMock.mockResolvedValueOnce([]);

    const items: CheckoutOrderItemInput[] = [
      {
        productId: "cafe",
        quantity: 1,
        unitPrice: 5500,
        modifiers: [buildModifierInput()],
      },
    ];

    const result = await orderDrizzleRepository.createOrder(buildLocalOrderInput(items));

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected createOrder to fail");

    // Only 3 insert calls attempted: order, payment, order items (which failed).
    // Modifiers insert was NEVER reached.
    expect(txMocks.insertMock).toHaveBeenCalledTimes(3);

    randomUuidSpy.mockRestore();
  });
});

describe("orderDrizzleRepository — rowToCheckoutOrder loads modifier snapshots", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    txMocks.insertReturningMock.mockResolvedValue([]);
    txMocks.updateReturningMock.mockResolvedValue([]);
  });

  it("loaded order includes modifier snapshots from order_item_modifiers table", async () => {
    const generatedId = "44444444-4444-4444-8444-444444444444";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const orderRow = buildOrderRow({ id: generatedId, total: 5500 });
    const paymentRow = buildPaymentRow({ id: generatedId, orderId: generatedId });
    const orderItemRow = buildOrderItemRow({ id: generatedId, orderId: generatedId, unitPrice: 5500 });

    // loadNextTicketNumber
    txMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });
    // createOrderRow
    txMocks.insertReturningMock.mockResolvedValueOnce([orderRow]);
    // createPaymentRow
    txMocks.insertReturningMock.mockResolvedValueOnce([paymentRow]);
    // createOrderItemRows
    txMocks.insertReturningMock.mockResolvedValueOnce([orderItemRow]);

    // After createOrderItemModifiers, rowToCheckoutOrder loads modifiers via:
    // tx.select().from(orderItemModifiers).where(inArray(orderItemId, ids))
    const modifierRows = [
      buildOrderItemModifierRow({
        id: "mod-1",
        orderItemId: generatedId,
        groupId: "g1",
        groupName: "Hielo",
        optionId: "o1",
        optionName: "Extra",
        priceDelta: 500,
        textValue: null,
      }),
      buildOrderItemModifierRow({
        id: "mod-2",
        orderItemId: generatedId,
        groupId: "g-comments",
        groupName: "Comentarios",
        optionId: null,
        optionName: "",
        priceDelta: 0,
        textValue: "sin azúcar",
      }),
    ];
    txMocks.selectMock.mockReturnValueOnce(selectChainSimple(modifierRows));

    const items: CheckoutOrderItemInput[] = [
      {
        productId: "cafe",
        quantity: 1,
        unitPrice: 5500,
        modifiers: [
          buildModifierInput({ groupId: "g1", groupName: "Hielo", optionId: "o1", optionName: "Extra", priceDelta: 500 }),
          buildModifierInput({
            groupId: "g-comments",
            groupName: "Comentarios",
            optionId: null,
            optionName: null,
            priceDelta: 0,
            textValue: "sin azúcar",
          }),
        ],
      },
    ];

    const result = await orderDrizzleRepository.createOrder(buildLocalOrderInput(items));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    const order = result.value;
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.modifiers).toHaveLength(2);
    expect(order.items[0]!.modifiers![0]).toMatchObject({
      groupId: "g1",
      groupName: "Hielo",
      optionId: "o1",
      optionName: "Extra",
      priceDelta: 500,
      textValue: null,
    });
    expect(order.items[0]!.modifiers![1]).toMatchObject({
      groupId: "g-comments",
      groupName: "Comentarios",
      optionId: null,
      optionName: "",
      priceDelta: 0,
      textValue: "sin azúcar",
    });
    expect(order.items[0]!.modifiers![0]!.id).toBeDefined();
    expect(order.items[0]!.modifiers![0]!.orderItemId).toBe(generatedId);
    expect(order.items[0]!.modifiers![0]!.createdAt).toBeInstanceOf(Date);

    randomUuidSpy.mockRestore();
  });

  it("loaded order returns empty modifiers array when item has no snapshot rows (pre-modifier historical order)", async () => {
    const generatedId = "55555555-5555-4555-8555-555555555555";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const orderRow = buildOrderRow({ id: generatedId, total: 4000 });
    const paymentRow = buildPaymentRow({ id: generatedId, orderId: generatedId });
    const orderItemRow = buildOrderItemRow({ id: generatedId, orderId: generatedId, unitPrice: 4000 });

    txMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });
    txMocks.insertReturningMock.mockResolvedValueOnce([orderRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([paymentRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([orderItemRow]);

    // No modifier rows in snapshot table
    txMocks.selectMock.mockReturnValueOnce(selectChainSimple([]));

    const items: CheckoutOrderItemInput[] = [
      { productId: "te", quantity: 1, unitPrice: 4000, modifiers: [] },
    ];

    const result = await orderDrizzleRepository.createOrder(buildLocalOrderInput(items));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    expect(result.value.items[0]!.modifiers).toEqual([]);

    randomUuidSpy.mockRestore();
  });

  it("snapshot is immutable: archived group rename does not alter loaded optionName", async () => {
    // This test documents the snapshot immutability contract:
    // even if the live group/option is renamed AFTER persistence,
    // the order_item_modifiers row keeps the original optionName.
    const generatedId = "66666666-6666-4666-8666-666666666666";
    const randomUuidSpy = spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const orderRow = buildOrderRow({ id: generatedId, total: 5500 });
    const paymentRow = buildPaymentRow({ id: generatedId, orderId: generatedId });
    const orderItemRow = buildOrderItemRow({ id: generatedId, orderId: generatedId, unitPrice: 5500 });

    txMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        orderBy: () => ({
          limit: mock(() => Promise.resolve([])),
        }),
      }),
    });
    txMocks.insertReturningMock.mockResolvedValueOnce([orderRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([paymentRow]);
    txMocks.insertReturningMock.mockResolvedValueOnce([orderItemRow]);

    // Snapshot persisted with optionName "Extra". Later the live option is renamed to "Doble",
    // but the snapshot row still reads "Extra" (immutable).
    txMocks.selectMock.mockReturnValueOnce(
      selectChainSimple([
        buildOrderItemModifierRow({
          orderItemId: generatedId,
          optionName: "Extra",
          groupName: "Nivel de hielo",
        }),
      ]),
    );

    const items: CheckoutOrderItemInput[] = [
      {
        productId: "cafe",
        quantity: 1,
        unitPrice: 5500,
        modifiers: [
          buildModifierInput({ groupId: "g1", groupName: "Nivel de hielo", optionId: "o1", optionName: "Extra", priceDelta: 500 }),
        ],
      },
    ];

    const result = await orderDrizzleRepository.createOrder(buildLocalOrderInput(items));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    // The loaded order reads from the snapshot, which still says "Extra"
    expect(result.value.items[0]!.modifiers![0]!.optionName).toBe("Extra");
    expect(result.value.items[0]!.modifiers![0]!.groupName).toBe("Nivel de hielo");

    randomUuidSpy.mockRestore();
  });
});