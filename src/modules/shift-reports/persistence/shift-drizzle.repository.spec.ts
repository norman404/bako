import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { CashMovementRow, OrderRow, ShiftRow } from "@/shared/db/schema";

// ─── db.select() mock: a chainable, thenable node ──────────────────────────
//
// Production code builds queries like `db.select({...}).from(x).leftJoin(y).where(z).orderBy(w)`,
// where the terminal chain method varies per call (some end in `.where()`, some in
// `.orderBy()`, some in `.limit()`, some in `.from()`). Every node below is BOTH
// chainable (returns itself for any further method call) AND thenable (resolves
// to the queued rows when awaited), so it doesn't matter which method is last.
// The node is a real Promise with the chain methods attached to it — this
// keeps it genuinely thenable (via Promise.prototype.then) without defining
// `then` on a plain object, which is what unicorn/no-thenable warns against.
function chain<T>(rows: T) {
  const node: any = Promise.resolve(rows);
  node.from = () => node;
  node.leftJoin = () => node;
  node.where = () => node;
  node.orderBy = () => node;
  node.limit = () => node;
  return node;
}

function chainMutations<T>(rows: T) {
  const node: any = Promise.resolve(rows);
  node.values = () => node;
  node.set = () => node;
  node.where = () => node;
  node.returning = () => node;
  return node;
}

const dbMocks = (() => {
  const selectMock = mock<any>();
  const insertMock = mock<any>();
  const updateMock = mock<any>();
  const deleteMock = mock<any>();
  return { selectMock, insertMock, updateMock, deleteMock };
})();

mock.module("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
    update: dbMocks.updateMock,
    delete: dbMocks.deleteMock,
  },
  withTransaction: async (operation: (tx: unknown) => Promise<unknown>) => operation({}),
}));

import { shiftDrizzleRepository } from "@/modules/shift-reports/persistence/shift-drizzle.repository";

const now = new Date("2026-06-04T08:00:00.000Z");

function buildShiftRow(overrides: Partial<ShiftRow> = {}): ShiftRow {
  return {
    id: overrides.id ?? "shift-1",
    openedAt: overrides.openedAt ?? now,
    closedAt: overrides.closedAt ?? null,
    status: overrides.status ?? "active",
    openingCash: overrides.openingCash ?? null,
    countedCash: overrides.countedCash ?? null,
    cashDifference: overrides.cashDifference ?? null,
  };
}

function buildCashMovementRow(overrides: Partial<CashMovementRow> = {}): CashMovementRow {
  return {
    id: overrides.id ?? "mv-1",
    shiftId: overrides.shiftId ?? "shift-1",
    type: overrides.type ?? "income",
    amount: overrides.amount ?? 5000,
    reason: overrides.reason ?? "Fondo adicional",
    createdAt: overrides.createdAt ?? now,
  };
}

// Shape of the projection used by getReport()'s orders+payments select.
interface GetReportOrderRow {
  orderId: string;
  ticketNumber: number;
  orderTotal: number;
  createdAt: Date;
  voidedAt: Date | null;
  method: string | null;
}

function buildGetReportOrderRow(overrides: Partial<GetReportOrderRow> = {}): GetReportOrderRow {
  return {
    orderId: overrides.orderId ?? "order-1",
    ticketNumber: overrides.ticketNumber ?? 1,
    orderTotal: overrides.orderTotal ?? 1000,
    createdAt: overrides.createdAt ?? now,
    voidedAt: overrides.voidedAt ?? null,
    method: overrides.method ?? "cash",
  };
}

// Shape of the projection used by getReport()'s orderItems+products select.
interface GetReportItemRow {
  orderId: string;
  productId: string;
  productName: string | null;
  quantity: number;
  unitPrice: number;
}

function buildGetReportItemRow(overrides: Partial<GetReportItemRow> = {}): GetReportItemRow {
  return {
    orderId: overrides.orderId ?? "order-1",
    productId: overrides.productId ?? "product-1",
    productName: overrides.productName ?? "Café",
    quantity: overrides.quantity ?? 1,
    unitPrice: overrides.unitPrice ?? 500,
  };
}

function buildListHistoryOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: overrides.id ?? "order-1",
    ticketNumber: overrides.ticketNumber ?? 1,
    customerId: overrides.customerId ?? null,
    deliveryPersonId: overrides.deliveryPersonId ?? null,
    shiftId: overrides.shiftId ?? "shift-1",
    total: overrides.total ?? 1000,
    createdAt: overrides.createdAt ?? now,
    voidedAt: overrides.voidedAt ?? null,
  };
}

// Shape of the projection used by queryOrderDetail()'s orders+payments+customers select.
interface OrderDetailOrderRow {
  id: string;
  ticketNumber: number;
  createdAt: Date;
  total: number;
  voidedAt: Date | null;
  deliveryPersonId: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  paymentMethod: string | null;
  paymentAmount: number | null;
}

function buildOrderDetailOrderRow(overrides: Partial<OrderDetailOrderRow> = {}): OrderDetailOrderRow {
  return {
    id: overrides.id ?? "order-1",
    ticketNumber: overrides.ticketNumber ?? 42,
    createdAt: overrides.createdAt ?? now,
    total: overrides.total ?? 5000,
    voidedAt: overrides.voidedAt ?? null,
    deliveryPersonId: overrides.deliveryPersonId ?? null,
    customerId: overrides.customerId ?? null,
    customerName: overrides.customerName ?? null,
    customerPhone: overrides.customerPhone ?? null,
    customerAddress: overrides.customerAddress ?? null,
    paymentMethod: overrides.paymentMethod ?? "cash",
    paymentAmount: overrides.paymentAmount ?? 5000,
  };
}

// Shape of the projection used by queryOrderDetail()'s orderItems+products select.
interface OrderDetailItemRow {
  id: string;
  productId: string;
  productName: string | null;
  quantity: number;
  unitPrice: number;
  categoryId: string | null;
}

function buildOrderDetailItemRow(overrides: Partial<OrderDetailItemRow> = {}): OrderDetailItemRow {
  return {
    id: overrides.id ?? "item-1",
    productId: overrides.productId ?? "product-1",
    productName: overrides.productName ?? "Café",
    quantity: overrides.quantity ?? 1,
    unitPrice: overrides.unitPrice ?? 5000,
    categoryId: overrides.categoryId ?? "category-1",
  };
}

// Shape of the projection used by queryOrderDetail()'s orderItemModifiers select.
interface OrderDetailModifierRow {
  itemId: string;
  groupId: string | null;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  textValue: string | null;
  priceDelta: number;
}

function buildOrderDetailModifierRow(overrides: Partial<OrderDetailModifierRow> = {}): OrderDetailModifierRow {
  return {
    itemId: overrides.itemId ?? "item-1",
    groupId: overrides.groupId ?? "group-1",
    groupName: overrides.groupName ?? "Hielo",
    optionId: overrides.optionId ?? "option-1",
    optionName: overrides.optionName ?? "Extra",
    textValue: overrides.textValue ?? null,
    priceDelta: overrides.priceDelta ?? 500,
  };
}

describe("shiftDrizzleRepository.getReport — voided orders", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("excludes voided orders from totals/counts but keeps them in the orders list", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1" });

    const orderA = buildGetReportOrderRow({
      orderId: "order-a",
      ticketNumber: 1,
      orderTotal: 1000,
      method: "cash",
      voidedAt: null,
    });
    const orderB = buildGetReportOrderRow({
      orderId: "order-b",
      ticketNumber: 2,
      orderTotal: 2000,
      method: "card",
      voidedAt: null,
    });
    const orderC = buildGetReportOrderRow({
      orderId: "order-c",
      ticketNumber: 3,
      orderTotal: 5000,
      method: "cash",
      voidedAt: new Date("2026-06-04T12:00:00.000Z"),
    });

    const itemA = buildGetReportItemRow({ orderId: "order-a", productId: "p1", quantity: 2, unitPrice: 500 });
    const itemB = buildGetReportItemRow({ orderId: "order-b", productId: "p2", quantity: 3, unitPrice: 666 });
    const itemC = buildGetReportItemRow({ orderId: "order-c", productId: "p3", quantity: 10, unitPrice: 500 });

    // 1) shiftRows: select().from(shifts).where().limit(1)
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    // 2) orderRows: select({...}).from(orders).leftJoin(payments).where().orderBy()
    dbMocks.selectMock.mockReturnValueOnce(chain([orderA, orderB, orderC]));
    // 3) itemRows: select({...}).from(orderItems).leftJoin(products).where()
    dbMocks.selectMock.mockReturnValueOnce(chain([itemA, itemB, itemC]));
    // 4) cash_movements: select().from(cashMovements).where()
    dbMocks.selectMock.mockReturnValueOnce(chain([]));

    const result = await shiftDrizzleRepository.getReport("shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    const report = result.value;

    // Voided order stays in the list, marked as such.
    expect(report.orders).toHaveLength(3);
    const byId = new Map(report.orders.map((o) => [o.orderId, o]));
    expect(byId.get("order-a")?.isVoided).toBe(false);
    expect(byId.get("order-b")?.isVoided).toBe(false);
    expect(byId.get("order-c")?.isVoided).toBe(true);

    // Totals/counts exclude the voided order (order-c: 5000, cash, 10 items).
    expect(report.totalOrders).toBe(2);
    expect(report.totalSales).toBe(3000);
    expect(report.cashTotal).toBe(1000);
    expect(report.cardTotal).toBe(2000);
    expect(report.totalItems).toBe(5);
  });
});

describe("shiftDrizzleRepository.listHistory — consistency with getReport", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("reports the same totalOrders/totalSales for a shift as getReport, excluding voided orders", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1" });

    const orderA = buildGetReportOrderRow({ orderId: "order-a", ticketNumber: 1, orderTotal: 1000, method: "cash", voidedAt: null });
    const orderB = buildGetReportOrderRow({ orderId: "order-b", ticketNumber: 2, orderTotal: 2000, method: "card", voidedAt: null });
    const orderC = buildGetReportOrderRow({
      orderId: "order-c",
      ticketNumber: 3,
      orderTotal: 5000,
      method: "cash",
      voidedAt: new Date("2026-06-04T12:00:00.000Z"),
    });

    const itemA = buildGetReportItemRow({ orderId: "order-a", productId: "p1", quantity: 2, unitPrice: 500 });
    const itemB = buildGetReportItemRow({ orderId: "order-b", productId: "p2", quantity: 3, unitPrice: 666 });
    const itemC = buildGetReportItemRow({ orderId: "order-c", productId: "p3", quantity: 10, unitPrice: 500 });

    // Queue calls for getReport(shift-1) first...
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([orderA, orderB, orderC]));
    dbMocks.selectMock.mockReturnValueOnce(chain([itemA, itemB, itemC]));
    dbMocks.selectMock.mockReturnValueOnce(chain([]));

    const reportResult = await shiftDrizzleRepository.getReport("shift-1");
    expect(reportResult.isOk()).toBe(true);
    if (reportResult.isErr()) throw reportResult.error;

    // ...then queue calls for listHistory(): select().from(shifts), select().from(orders).
    const listOrderA = buildListHistoryOrderRow({ id: "order-a", shiftId: "shift-1", total: 1000, voidedAt: null });
    const listOrderB = buildListHistoryOrderRow({ id: "order-b", shiftId: "shift-1", total: 2000, voidedAt: null });
    const listOrderC = buildListHistoryOrderRow({
      id: "order-c",
      shiftId: "shift-1",
      total: 5000,
      voidedAt: new Date("2026-06-04T12:00:00.000Z"),
    });

    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([listOrderA, listOrderB, listOrderC]));

    const historyResult = await shiftDrizzleRepository.listHistory();
    expect(historyResult.isOk()).toBe(true);
    if (historyResult.isErr()) throw historyResult.error;

    const historyEntry = historyResult.value.find((h) => h.shiftId === "shift-1");
    expect(historyEntry).toBeDefined();

    const report = reportResult.value;
    expect(historyEntry?.totalOrders).toBe(report.totalOrders);
    expect(historyEntry?.totalSales).toBe(report.totalSales);
    expect(historyEntry?.totalOrders).toBe(2);
    expect(historyEntry?.totalSales).toBe(3000);
  });
});

describe("shiftDrizzleRepository.getOrderDetail — fulfillmentType, categoryId, modifier ids", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("resolves fulfillmentType 'delivery' and populates categoryId/groupId/optionId when deliveryPersonId is set", async () => {
    const orderRow = buildOrderDetailOrderRow({ id: "order-1", deliveryPersonId: "delivery-person-1" });
    const itemRow = buildOrderDetailItemRow({ id: "item-1", categoryId: "category-1" });
    const modifierRow = buildOrderDetailModifierRow({
      itemId: "item-1",
      groupId: "group-1",
      optionId: "option-1",
    });

    // 1) orders+payments+customers
    dbMocks.selectMock.mockReturnValueOnce(chain([orderRow]));
    // 2) orderItems+products
    dbMocks.selectMock.mockReturnValueOnce(chain([itemRow]));
    // 3) orderItemModifiers (itemIds.length > 0)
    dbMocks.selectMock.mockReturnValueOnce(chain([modifierRow]));

    const result = await shiftDrizzleRepository.getOrderDetail("order-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    const detail = result.value;
    expect(detail.fulfillmentType).toBe("delivery");
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0]!.categoryId).toBe("category-1");
    expect(detail.items[0]!.modifiers).toHaveLength(1);
    expect(detail.items[0]!.modifiers[0]!.groupId).toBe("group-1");
    expect(detail.items[0]!.modifiers[0]!.optionId).toBe("option-1");
  });

  it("resolves fulfillmentType 'local' when deliveryPersonId is null", async () => {
    const orderRow = buildOrderDetailOrderRow({ id: "order-2", deliveryPersonId: null });
    const itemRow = buildOrderDetailItemRow({ id: "item-2" });

    dbMocks.selectMock.mockReturnValueOnce(chain([orderRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([itemRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([]));

    const result = await shiftDrizzleRepository.getOrderDetail("order-2");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.fulfillmentType).toBe("local");
  });
});

describe("shiftDrizzleRepository.openShift — opening cash", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("inserts opening_cash in the new shift", async () => {
    // 1) select active shifts -> empty
    dbMocks.selectMock.mockReturnValueOnce(chain([]));
    // 2) insert returning the created row with openingCash
    const createdRow = buildShiftRow({ id: "shift-1", status: "active", openingCash: 10000 });
    dbMocks.insertMock.mockReturnValueOnce(chainMutations([createdRow]));

    const result = await shiftDrizzleRepository.openShift(10000);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.openingCash).toBe(10000);
  });
});

describe("shiftDrizzleRepository.closeShift — cash reconciliation", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("calculates exact cash difference (zero)", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1", openingCash: 10000 });
    // 1) select shift by id
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    // 2) select orders+payments (cash sales = 5000)
    const orderRow = buildGetReportOrderRow({
      orderId: "order-1",
      orderTotal: 5000,
      method: "cash",
      voidedAt: null,
    });
    dbMocks.selectMock.mockReturnValueOnce(chain([orderRow]));
    // 3) select cash_movements (income=2000, expense=1000)
    const income = buildCashMovementRow({ id: "mv-1", type: "income", amount: 2000 });
    const expense = buildCashMovementRow({ id: "mv-2", type: "expense", amount: 1000 });
    dbMocks.selectMock.mockReturnValueOnce(chain([income, expense]));
    // 4) update shift returning updated row
    const updatedRow = buildShiftRow({
      id: "shift-1",
      status: "closed",
      openingCash: 10000,
      countedCash: 16000,
      cashDifference: 0,
    });
    dbMocks.updateMock.mockReturnValueOnce(chainMutations([updatedRow]));

    const result = await shiftDrizzleRepository.closeShift("shift-1", 16000);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.countedCash).toBe(16000);
    expect(result.value.cashDifference).toBe(0);
  });

  it("calculates positive difference (surplus)", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1", openingCash: 10000 });
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    const orderRow = buildGetReportOrderRow({
      orderId: "order-1",
      orderTotal: 5000,
      method: "cash",
      voidedAt: null,
    });
    dbMocks.selectMock.mockReturnValueOnce(chain([orderRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([]));
    const updatedRow = buildShiftRow({
      id: "shift-1",
      status: "closed",
      openingCash: 10000,
      countedCash: 15500,
      cashDifference: 500,
    });
    dbMocks.updateMock.mockReturnValueOnce(chainMutations([updatedRow]));

    const result = await shiftDrizzleRepository.closeShift("shift-1", 15500);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.cashDifference).toBe(500);
  });

  it("calculates negative difference (shortage)", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1", openingCash: 10000 });
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    const orderRow = buildGetReportOrderRow({
      orderId: "order-1",
      orderTotal: 5000,
      method: "cash",
      voidedAt: null,
    });
    dbMocks.selectMock.mockReturnValueOnce(chain([orderRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([]));
    const updatedRow = buildShiftRow({
      id: "shift-1",
      status: "closed",
      openingCash: 10000,
      countedCash: 14000,
      cashDifference: -1000,
    });
    dbMocks.updateMock.mockReturnValueOnce(chainMutations([updatedRow]));

    const result = await shiftDrizzleRepository.closeShift("shift-1", 14000);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.cashDifference).toBe(-1000);
  });

  it("rejects when shift not found", async () => {
    dbMocks.selectMock.mockReturnValueOnce(chain([]));

    const result = await shiftDrizzleRepository.closeShift("shift-1", 16000);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("expected error");
    expect(result.error.code).toBe("shiftNotFound");
  });
});

describe("shiftDrizzleRepository.getActive — opening cash", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("returns openingCash from the shift row", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1", openingCash: 10000 });
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));

    const result = await shiftDrizzleRepository.getActive();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value?.openingCash).toBe(10000);
  });

  it("returns openingCash=0 for legacy shifts (null coalesce)", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1", openingCash: null });
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));

    const result = await shiftDrizzleRepository.getActive();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value?.openingCash).toBe(0);
  });
});

describe("shiftDrizzleRepository.getReport — cash summary", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("includes openingCash, cashMovements, expectedCash in the report", async () => {
    const shiftRow = buildShiftRow({
      id: "shift-1",
      openingCash: 10000,
      countedCash: 12500,
      cashDifference: 0,
    });
    // 1) select shift
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    // 2) select orders+payments: cash 3000, card 2000
    const orderCash = buildGetReportOrderRow({
      orderId: "order-1",
      orderTotal: 3000,
      method: "cash",
      voidedAt: null,
    });
    const orderCard = buildGetReportOrderRow({
      orderId: "order-2",
      orderTotal: 2000,
      method: "card",
      voidedAt: null,
    });
    dbMocks.selectMock.mockReturnValueOnce(chain([orderCash, orderCard]));
    // 3) select items
    dbMocks.selectMock.mockReturnValueOnce(chain([]));
    // 4) select cash_movements: income 500, expense 1000
    const income = buildCashMovementRow({ id: "mv-1", type: "income", amount: 500 });
    const expense = buildCashMovementRow({ id: "mv-2", type: "expense", amount: 1000 });
    dbMocks.selectMock.mockReturnValueOnce(chain([income, expense]));

    const result = await shiftDrizzleRepository.getReport("shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;

    const report = result.value;
    expect(report.openingCash).toBe(10000);
    expect(report.cashMovementsIn).toBe(500);
    expect(report.cashMovementsOut).toBe(1000);
    // expectedCash = openingCash(10000) + cashTotal(3000) + income(500) - expense(1000) = 12500
    expect(report.expectedCash).toBe(12500);
    expect(report.countedCash).toBe(12500);
    expect(report.cashDifference).toBe(0);
    expect(report.cashMovements).toHaveLength(2);
  });
});

describe("shiftDrizzleRepository.listHistory — opening cash", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("includes openingCash and cashDifference in history items", async () => {
    const shiftRow = buildShiftRow({ id: "shift-1", openingCash: 10000, cashDifference: 200 });
    dbMocks.selectMock.mockReturnValueOnce(chain([shiftRow]));
    dbMocks.selectMock.mockReturnValueOnce(chain([]));

    const result = await shiftDrizzleRepository.listHistory();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    const entry = result.value.find((h) => h.shiftId === "shift-1");
    expect(entry).toBeDefined();
    expect(entry?.openingCash).toBe(10000);
    expect(entry?.cashDifference).toBe(200);
  });
});

describe("shiftDrizzleRepository.addCashMovement", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("inserts a new cash movement and returns it", async () => {
    const createdRow = buildCashMovementRow({
      id: "mv-1",
      shiftId: "shift-1",
      type: "income",
      amount: 5000,
      reason: "Fondo",
    });
    dbMocks.insertMock.mockReturnValueOnce(chainMutations([createdRow]));

    const result = await shiftDrizzleRepository.addCashMovement("shift-1", {
      type: "income",
      amount: 5000,
      reason: "Fondo",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.id).toBe("mv-1");
    expect(result.value.shiftId).toBe("shift-1");
    expect(result.value.type).toBe("income");
    expect(result.value.amount).toBe(5000);
    expect(result.value.reason).toBe("Fondo");
  });
});

describe("shiftDrizzleRepository.updateCashMovement", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("updates amount and reason, returns the updated movement", async () => {
    const updatedRow = buildCashMovementRow({
      id: "mv-1",
      shiftId: "shift-1",
      type: "expense",
      amount: 2500,
      reason: "Compra de bolsas",
    });
    dbMocks.updateMock.mockReturnValueOnce(chainMutations([updatedRow]));

    const result = await shiftDrizzleRepository.updateCashMovement("mv-1", {
      amount: 2500,
      reason: "Compra de bolsas",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.amount).toBe(2500);
    expect(result.value.reason).toBe("Compra de bolsas");
    expect(result.value.type).toBe("expense");
  });
});

describe("shiftDrizzleRepository.deleteCashMovement", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("deletes a cash movement", async () => {
    dbMocks.deleteMock.mockReturnValueOnce(chainMutations(undefined));

    const result = await shiftDrizzleRepository.deleteCashMovement("mv-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(dbMocks.deleteMock).toHaveBeenCalled();
  });
});

describe("shiftDrizzleRepository.listCashMovements", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("lists movements for a shift ordered by createdAt", async () => {
    const mv1 = buildCashMovementRow({ id: "mv-1", type: "income", amount: 2000, createdAt: now });
    const mv2 = buildCashMovementRow({ id: "mv-2", type: "expense", amount: 1000 });
    dbMocks.selectMock.mockReturnValueOnce(chain([mv1, mv2]));

    const result = await shiftDrizzleRepository.listCashMovements("shift-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toHaveLength(2);
    expect(result.value[0]!.id).toBe("mv-1");
    expect(result.value[1]!.id).toBe("mv-2");
  });
});
