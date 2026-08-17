import { desc, inArray } from "drizzle-orm";
import { errAsync, ResultAsync } from "neverthrow";

import { withTransaction, type DatabaseClient } from "@/db/client";
import {
  orderItems,
  orderItemModifiers,
  orders,
  payments,
  type OrderInsert,
  type OrderItemInsert,
  type OrderItemModifierInsert,
  type OrderItemModifierRow,
  type OrderItemRow,
  type OrderRow,
  type PaymentInsert,
  type PaymentRow,
} from "@/db/schema";
import {
  CHECKOUT_PAYMENT_METHOD,
  calculateOrderTotal,
  type CheckoutOrder,
  type CheckoutOrderItem,
  type CheckoutOrderItemInput,
  type CheckoutOrderItemModifier,
  type CheckoutPayment,
  type CheckoutPaymentMethod,
  type CreateOrderInput,
} from "./order";
import { CheckoutPersistenceError } from "./errors";

export {
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutPaymentMethod,
  type CheckoutPaymentInput,
  type CreateOrderInput,
  type CheckoutOrder,
} from "./order";
export { CheckoutPersistenceError } from "./errors";

const CHECKOUT_PAYMENT_METHOD_VALUES = new Set<CheckoutPaymentMethod>(
  Object.values(CHECKOUT_PAYMENT_METHOD),
);

interface NormalizedCheckoutPaymentInput {
  method: string;
  amount: number;
  cashReceived: number | null;
}

interface NormalizedCreateOrderInput {
  items: CheckoutOrderItemInput[];
  shiftId: string | null;
  payments: NormalizedCheckoutPaymentInput[];
}

function formatUnknownError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function wrapPersistenceError(context: string) {
  return (cause: unknown) => {
    if (cause instanceof CheckoutPersistenceError) {
      return cause;
    }

    return new CheckoutPersistenceError(
      "dbError",
      { context, cause: formatUnknownError(cause) },
      `${context}: ${formatUnknownError(cause)}`,
    );
  };
}

function isCheckoutPaymentMethod(value: string): value is CheckoutPaymentMethod {
  return CHECKOUT_PAYMENT_METHOD_VALUES.has(value as CheckoutPaymentMethod);
}

function toCheckoutPaymentMethod(value: string): CheckoutPaymentMethod {
  if (!isCheckoutPaymentMethod(value)) {
    throw new CheckoutPersistenceError("invalidPaymentMethod", { value });
  }

  return value;
}

function validatePaymentInput(
  paymentsInput: NormalizedCheckoutPaymentInput[],
  total: number,
): CheckoutPersistenceError | null {
  if (paymentsInput.length === 0) {
    return new CheckoutPersistenceError("paymentRequired");
  }

  const methods = new Set<string>();
  let appliedTotal = 0;

  for (const payment of paymentsInput) {
    if (!isCheckoutPaymentMethod(payment.method)) {
      return new CheckoutPersistenceError("invalidPaymentMethod", { method: payment.method });
    }

    if (!Number.isInteger(payment.amount) || payment.amount < 0) {
      return new CheckoutPersistenceError("invalidPaymentAmount", { amount: payment.amount });
    }

    if (paymentsInput.length > 1 && payment.amount === 0) {
      return new CheckoutPersistenceError("invalidPaymentAmount", { amount: payment.amount });
    }

    if (methods.has(payment.method)) {
      return new CheckoutPersistenceError("duplicatePaymentMethod", { method: payment.method });
    }
    methods.add(payment.method);

    if (payment.method === CHECKOUT_PAYMENT_METHOD.CASH) {
      if (
        payment.cashReceived === null ||
        !Number.isInteger(payment.cashReceived) ||
        payment.cashReceived < payment.amount
      ) {
        return new CheckoutPersistenceError("cashReceivedInvalid", {
          amount: payment.amount,
          cashReceived: payment.cashReceived,
        });
      }

      if (paymentsInput.length > 1 && payment.cashReceived !== payment.amount) {
        return new CheckoutPersistenceError("mixedPaymentCashReceivedMismatch");
      }
    } else if (payment.cashReceived !== null) {
      return new CheckoutPersistenceError("cashReceivedInvalid");
    }

    appliedTotal += payment.amount;
  }

  if (appliedTotal !== total) {
    return new CheckoutPersistenceError("paymentTotalMismatch", {
      appliedTotal,
      total,
    });
  }

  return null;
}

function validateCreateOrderInput(input: NormalizedCreateOrderInput): CheckoutPersistenceError | null {
  if (input.items.length === 0) {
    return new CheckoutPersistenceError("orderItemsRequired");
  }

  for (const item of input.items) {
    if (item.productId.trim().length === 0) {
      return new CheckoutPersistenceError("orderItemProductIdRequired");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return new CheckoutPersistenceError("orderItemQuantityInvalid", { quantity: item.quantity });
    }

    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      return new CheckoutPersistenceError("orderItemUnitPriceInvalid", { unitPrice: item.unitPrice });
    }
  }

  const total = calculateOrderTotal(input.items);
  return validatePaymentInput(input.payments, total);
}

function normalizeCreateOrderInput(input: CreateOrderInput): NormalizedCreateOrderInput {
  return {
    items: input.items.map((item) => ({
      productId: item.productId.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: (item.modifiers ?? []).map((modifier) => ({
        groupId: modifier.groupId,
        groupName: modifier.groupName,
        optionId: modifier.optionId,
        optionName: modifier.optionName ?? "",
        priceDelta: modifier.priceDelta,
        textValue: modifier.textValue,
      })),
    })),
    shiftId: input.shiftId?.trim() || null,
    payments: (input.payments ?? []).map((payment) => ({
      method: String(payment.method ?? "")
        .trim()
        .toLowerCase(),
      amount: payment.amount,
      cashReceived: payment.cashReceived ?? null,
    })),
  };
}

function rowToCheckoutPayment(row: PaymentRow): CheckoutPayment {
  return {
    id: row.id,
    orderId: row.orderId,
    method: toCheckoutPaymentMethod(row.method),
    amount: row.amount,
    cashReceived: row.cashReceived ?? null,
    createdAt: row.createdAt,
  };
}

function rowToCheckoutOrderItem(row: OrderItemRow, modifiers: CheckoutOrderItemModifier[]): CheckoutOrderItem {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    modifiers,
    createdAt: row.createdAt,
  };
}

function rowToCheckoutOrderItemModifier(row: OrderItemModifierRow): CheckoutOrderItemModifier {
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    groupId: row.groupId,
    groupName: row.groupName,
    optionId: row.optionId,
    optionName: row.optionName,
    priceDelta: row.priceDelta,
    textValue: row.textValue,
    createdAt: row.createdAt,
  };
}

function rowToCheckoutOrder(
  row: OrderRow,
  itemRows: OrderItemRow[],
  modifierRowsByItem: Map<string, OrderItemModifierRow[]>,
  paymentRows: PaymentRow[],
): CheckoutOrder {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    shiftId: row.shiftId ?? null,
    total: row.total,
    createdAt: row.createdAt,
    items: itemRows.map((itemRow) =>
      rowToCheckoutOrderItem(
        itemRow,
        (modifierRowsByItem.get(itemRow.id) ?? []).map(rowToCheckoutOrderItemModifier),
      ),
    ),
    payments: paymentRows.map(rowToCheckoutPayment),
  };
}

async function loadNextTicketNumber(tx: DatabaseClient): Promise<number> {
  const rows = await tx
    .select({ ticketNumber: orders.ticketNumber })
    .from(orders)
    .orderBy(desc(orders.ticketNumber))
    .limit(1);

  return (rows[0]?.ticketNumber ?? 0) + 1;
}

async function createOrderRow(
  tx: DatabaseClient,
  ticketNumber: number,
  shiftId: string | null,
  total: number,
  now: Date,
): Promise<OrderRow> {
  const orderValues: OrderInsert = {
    id: crypto.randomUUID(),
    ticketNumber,
    shiftId,
    total,
    createdAt: now,
  };

  const [createdOrder] = await tx.insert(orders).values(orderValues).returning();

  if (!createdOrder) {
    throw new CheckoutPersistenceError(
      "dbError",
      { context: "Failed to load created order" },
      "Failed to load created order",
    );
  }

  return createdOrder;
}

async function createPaymentRows(
  tx: DatabaseClient,
  orderId: string,
  paymentInputs: NormalizedCheckoutPaymentInput[],
  now: Date,
): Promise<PaymentRow[]> {
  const paymentValues: PaymentInsert[] = paymentInputs.map((payment) => ({
    id: crypto.randomUUID(),
    orderId,
    method: payment.method,
    amount: payment.amount,
    cashReceived: payment.cashReceived,
    createdAt: now,
  }));

  const createdPayments = await tx.insert(payments).values(paymentValues).returning();

  if (createdPayments.length !== paymentValues.length) {
    throw new CheckoutPersistenceError(
      "dbError",
      { context: "Failed to load created payments" },
      "Failed to load created payments",
    );
  }

  return createdPayments;
}

async function createOrderItemRows(
  tx: DatabaseClient,
  orderId: string,
  items: CheckoutOrderItemInput[],
  now: Date,
): Promise<OrderItemRow[]> {
  const orderItemValues: OrderItemInsert[] = items.map((item) => ({
    id: crypto.randomUUID(),
    orderId,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    createdAt: now,
  }));

  const createdOrderItems = await tx.insert(orderItems).values(orderItemValues).returning();

  if (createdOrderItems.length !== orderItemValues.length) {
    throw new CheckoutPersistenceError(
      "dbError",
      { context: "Failed to load created order items" },
      "Failed to load created order items",
    );
  }

  return createdOrderItems;
}

async function createOrderItemModifiers(
  tx: DatabaseClient,
  orderItemRows: OrderItemRow[],
  items: CheckoutOrderItemInput[],
  now: Date,
): Promise<void> {
  const modifierValues: OrderItemModifierInsert[] = [];

  orderItemRows.forEach((orderItemRow, index) => {
    const item = items[index];
    if (!item) return;

    for (const modifier of item.modifiers ?? []) {
      modifierValues.push({
        id: crypto.randomUUID(),
        orderItemId: orderItemRow.id,
        groupId: modifier.groupId,
        groupName: modifier.groupName,
        optionId: modifier.optionId,
        optionName: modifier.optionName ?? "",
        priceDelta: modifier.priceDelta,
        textValue: modifier.textValue,
        createdAt: now,
      });
    }
  });

  if (modifierValues.length === 0) return;

  await tx.insert(orderItemModifiers).values(modifierValues);
}

async function loadOrderItemModifierRows(
  tx: DatabaseClient,
  orderItemRows: OrderItemRow[],
): Promise<Map<string, OrderItemModifierRow[]>> {
  const orderItemIds = orderItemRows.map((row) => row.id);
  if (orderItemIds.length === 0) {
    return new Map();
  }

  const rows = await tx
    .select()
    .from(orderItemModifiers)
    .where(inArray(orderItemModifiers.orderItemId, orderItemIds));

  return rows.reduce((map, row) => {
    const existing = map.get(row.orderItemId);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.orderItemId, [row]);
    }
    return map;
  }, new Map<string, OrderItemModifierRow[]>());
}

export const orderDrizzleRepository = {
  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError> {
    const normalizedInput = normalizeCreateOrderInput(input);
    const validationError = validateCreateOrderInput(normalizedInput);
    if (validationError) {
      return errAsync(validationError);
    }

    const total = calculateOrderTotal(normalizedInput.items);

    return ResultAsync.fromPromise(
      withTransaction(async (tx) => {
        const now = new Date();
        const ticketNumber = await loadNextTicketNumber(tx);
        const orderRow = await createOrderRow(tx, ticketNumber, normalizedInput.shiftId, total, now);
        const paymentRows = await createPaymentRows(tx, orderRow.id, normalizedInput.payments, now);
        const orderItemRows = await createOrderItemRows(tx, orderRow.id, normalizedInput.items, now);
        await createOrderItemModifiers(tx, orderItemRows, normalizedInput.items, now);

        const orderItemModifierRows = await loadOrderItemModifierRows(tx, orderItemRows);

        return rowToCheckoutOrder(orderRow, orderItemRows, orderItemModifierRows, paymentRows);
      }),
      wrapPersistenceError("Failed to create order"),
    );
  },
};
