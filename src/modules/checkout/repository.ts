import { desc, eq, inArray } from "drizzle-orm";
import { errAsync, ResultAsync } from "neverthrow";

import { isOrderChannel } from "@/modules/order";

import { withTransaction, type DatabaseClient } from "@/db/client";
import {
  orderItems,
  orderItemModifiers,
  orderPromotions,
  orders,
  payments,
  shifts,
  featureFlags,
  type OrderInsert,
  type OrderItemInsert,
  type OrderItemModifierInsert,
  type OrderItemModifierRow,
  type OrderItemRow,
  type OrderPromotionInsert,
  type OrderRow,
  type PaymentInsert,
  type PaymentRow,
} from "@/db/schema";
import {
  type CheckoutOrder,
  type CheckoutOrderItem,
  type CheckoutOrderItemModifier,
  type CheckoutPayment,
  type CheckoutPaymentMethod,
  type CreateOrderInput,
} from "./order";
import { CheckoutPersistenceError } from "./errors";
import {
  initialOrderAccounting,
  isCheckoutPaymentMethod,
  normalizeCreateOrderInput,
  validateCreateOrderInput,
  type NormalizedCheckoutOrderItemInput,
  type NormalizedCheckoutPaymentInput,
  type NormalizedCreateOrderInput,
} from "./checkout-validation";

export {
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutPaymentMethod,
  type CheckoutPaymentInput,
  type CreateOrderInput,
  type CheckoutOrder,
} from "./order";
export { CheckoutPersistenceError } from "./errors";

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

function toCheckoutPaymentMethod(value: string): CheckoutPaymentMethod {
  if (!isCheckoutPaymentMethod(value)) {
    throw new CheckoutPersistenceError("invalidPaymentMethod", { value });
  }

  return value;
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
    unitCost: row.unitCost,
    discountAmount: row.discountAmount,
    orderPromotionId: row.orderPromotionId,
    parentOrderItemId: row.parentOrderItemId,
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
  if (!isOrderChannel(row.channel)) throw new CheckoutPersistenceError("invalidOrderChannel");
  return {
    id: row.id,
    channel: row.channel,
    deliveryReference: row.deliveryReference,
    confirmedAt: row.confirmedAt,
    orderName: row.orderName ?? null,
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
  input: NormalizedCreateOrderInput,
  now: Date,
): Promise<OrderRow> {
  const orderValues: OrderInsert = {
    id: crypto.randomUUID(),
    ticketNumber,
    orderName: input.orderName,
    shiftId: input.shiftId,
    channel: input.channel,
    deliveryReference: input.deliveryReference,
    ...initialOrderAccounting(input, now),
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

async function createOrderPromotionRows(
  tx: DatabaseClient,
  orderId: string,
  input: NormalizedCreateOrderInput,
  now: Date,
): Promise<Map<string, string>> {
  const idsByRef = new Map<string, string>();
  if (input.promotions.length === 0) return idsByRef;

  const values: OrderPromotionInsert[] = input.promotions.map((promotion) => {
    const id = crypto.randomUUID();
    idsByRef.set(promotion.ref, id);
    return {
      id,
      orderId,
      promotionId: promotion.promotionId,
      kind: promotion.kind,
      nameSnapshot: promotion.name,
      ruleSnapshot: promotion.ruleSnapshot,
      discountAmount: promotion.discountAmount,
      createdAt: now,
    };
  });

  await tx.insert(orderPromotions).values(values);
  return idsByRef;
}

async function insertOrderItemRows(tx: DatabaseClient, values: OrderItemInsert[]): Promise<OrderItemRow[]> {
  if (values.length === 0) return [];

  const createdOrderItems = await tx.insert(orderItems).values(values).returning();

  if (createdOrderItems.length !== values.length) {
    throw new CheckoutPersistenceError(
      "dbError",
      { context: "Failed to load created order items" },
      "Failed to load created order items",
    );
  }

  return createdOrderItems;
}

async function createOrderItemRows(
  tx: DatabaseClient,
  orderId: string,
  items: NormalizedCheckoutOrderItemInput[],
  promotionIdsByRef: Map<string, string>,
  now: Date,
): Promise<OrderItemRow[]> {
  const orderItemValues: OrderItemInsert[] = items.map((item) => ({
    id: crypto.randomUUID(),
    orderId,
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unitCost: item.unitCost,
    discountAmount: item.discountAmount,
    orderPromotionId: item.promotionRef === null ? null : (promotionIdsByRef.get(item.promotionRef) ?? null),
    createdAt: now,
  }));

  return insertOrderItemRows(tx, orderItemValues);
}

// Composite children are informational (kitchen routing and sale detail): the parent line
// carries the whole price, cost and discount, so children are stored at zero.
async function createOrderItemChildRows(
  tx: DatabaseClient,
  orderId: string,
  parentRows: OrderItemRow[],
  items: NormalizedCheckoutOrderItemInput[],
  now: Date,
): Promise<OrderItemRow[]> {
  const childValues: OrderItemInsert[] = parentRows.flatMap((parentRow, index) =>
    (items[index]?.children ?? []).map((child) => ({
      id: crypto.randomUUID(),
      orderId,
      productId: child.productId,
      quantity: child.quantity,
      unitPrice: 0,
      unitCost: 0,
      discountAmount: 0,
      parentOrderItemId: parentRow.id,
      createdAt: now,
    })),
  );

  return insertOrderItemRows(tx, childValues);
}

async function createOrderItemModifiers(
  tx: DatabaseClient,
  orderItemRows: OrderItemRow[],
  items: NormalizedCheckoutOrderItemInput[],
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

    return ResultAsync.fromPromise(
      withTransaction(async (tx) => {
        const now = new Date();
        const [shiftFlag] = await tx.select().from(featureFlags).where(eq(featureFlags.key, "shift_management_enabled"));
        if (normalizedInput.shiftId) {
          const [shift] = await tx.select().from(shifts).where(eq(shifts.id, normalizedInput.shiftId));
          if (!shift || shift.status !== "active") throw new CheckoutPersistenceError("noActiveShift");
        } else if (shiftFlag?.value === "true") {
          throw new CheckoutPersistenceError("noActiveShift");
        }
        const ticketNumber = await loadNextTicketNumber(tx);
        const orderRow = await createOrderRow(
          tx,
          ticketNumber,
          normalizedInput,
          now,
        );
        const paymentRows = normalizedInput.payments.length === 0
          ? []
          : await createPaymentRows(tx, orderRow.id, normalizedInput.payments, now);
        const promotionIdsByRef = await createOrderPromotionRows(tx, orderRow.id, normalizedInput, now);
        const orderItemRows = await createOrderItemRows(tx, orderRow.id, normalizedInput.items, promotionIdsByRef, now);
        await createOrderItemModifiers(tx, orderItemRows, normalizedInput.items, now);
        const childRows = await createOrderItemChildRows(tx, orderRow.id, orderItemRows, normalizedInput.items, now);

        const orderItemModifierRows = await loadOrderItemModifierRows(tx, orderItemRows);

        return rowToCheckoutOrder(orderRow, [...orderItemRows, ...childRows], orderItemModifierRows, paymentRows);
      }),
      wrapPersistenceError("Failed to create order"),
    );
  },
};
