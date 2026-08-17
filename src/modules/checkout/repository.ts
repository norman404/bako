import { desc, eq, inArray, like, or } from "drizzle-orm";
import { errAsync, ResultAsync } from "neverthrow";

import { db, withTransaction, type DatabaseClient } from "@/db/client";
import {
  customers,
  orderItems,
  orderItemModifiers,
  orders,
  payments,
  type CustomerInsert,
  type CustomerRow,
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
  CHECKOUT_FULFILLMENT_TYPE,
  CHECKOUT_PAYMENT_METHOD,
  calculateOrderTotal,
  type CheckoutCustomer,
  type CheckoutCustomerInput,
  type CheckoutFulfillmentType,
  type CheckoutOrder,
  type CheckoutOrderItem,
  type CheckoutOrderItemInput,
  type CheckoutOrderItemModifier,
  type CheckoutPayment,
  type CheckoutPaymentInput,
  type CheckoutPaymentMethod,
  type CreateOrderInput,
} from "./order";
import { CheckoutPersistenceError } from "./errors";

export {
  CHECKOUT_FULFILLMENT_TYPE,
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutFulfillmentType,
  type CheckoutPaymentMethod,
  type CheckoutCustomerInput,
  type CreateOrderInput,
  type CheckoutCustomer,
  type CheckoutOrder,
} from "./order";
export { CheckoutPersistenceError } from "./errors";

const CUSTOMER_LIST_LIMIT = {
  RECENT: 6,
  SEARCH: 8,
} as const;

const CHECKOUT_PAYMENT_METHOD_VALUES = new Set<CheckoutPaymentMethod>(
  Object.values(CHECKOUT_PAYMENT_METHOD),
);

interface NormalizedCheckoutPaymentInput {
  method: string;
  amount: number;
}

interface NormalizedCreateOrderInput {
  items: CheckoutOrderItemInput[];
  fulfillmentType: CheckoutFulfillmentType;
  customerId: string | null;
  customer: CheckoutCustomerInput | null;
  shiftId: string | null;
  payment: NormalizedCheckoutPaymentInput;
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

function validateCustomerInput(customer: CheckoutCustomerInput): CheckoutPersistenceError | null {
  if (customer.name.trim().length === 0) {
    return new CheckoutPersistenceError("customerNameRequired");
  }

  if (customer.phone.trim().length === 0) {
    return new CheckoutPersistenceError("customerPhoneRequired");
  }

  if (customer.address.trim().length === 0) {
    return new CheckoutPersistenceError("customerAddressRequired");
  }

  return null;
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
  payment: NormalizedCheckoutPaymentInput,
  total: number,
): CheckoutPersistenceError | null {
  if (!isCheckoutPaymentMethod(payment.method)) {
    return new CheckoutPersistenceError("invalidPaymentMethod", { method: payment.method });
  }

  if (!Number.isInteger(payment.amount) || payment.amount < 0) {
    return new CheckoutPersistenceError("invalidPaymentAmount", { amount: payment.amount });
  }

  if (payment.amount < total) {
    return new CheckoutPersistenceError("insufficientPaymentAmount", { amount: payment.amount, total });
  }

  if (payment.method === CHECKOUT_PAYMENT_METHOD.CARD && payment.amount !== total) {
    return new CheckoutPersistenceError("cardPaymentExactMatchRequired", { amount: payment.amount, total });
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
  const paymentError = validatePaymentInput(input.payment, total);
  if (paymentError) {
    return paymentError;
  }

  if (input.customerId && input.customer) {
    return new CheckoutPersistenceError("customerIdAndCustomerConflict");
  }

  if (input.fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.LOCAL) {
    if (input.customerId || input.customer) {
      return new CheckoutPersistenceError("localOrderCustomerForbidden");
    }

    return null;
  }

  if (!input.customerId && !input.customer) {
    return new CheckoutPersistenceError("deliveryOrderCustomerRequired");
  }

  if (!input.customer) {
    return null;
  }

  return validateCustomerInput(input.customer);
}

function normalizeCreateOrderInput(input: CreateOrderInput): NormalizedCreateOrderInput {
  const normalizedCustomerId = input.customerId?.trim() ?? "";
  const normalizedCustomer = input.customer
    ? {
        name: input.customer.name.trim(),
        phone: input.customer.phone.trim(),
        address: input.customer.address.trim(),
      }
    : null;

  const fulfillmentType =
    input.fulfillmentType ??
    (normalizedCustomerId.length > 0 || normalizedCustomer
      ? CHECKOUT_FULFILLMENT_TYPE.DELIVERY
      : CHECKOUT_FULFILLMENT_TYPE.LOCAL);

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
      fulfillmentType,
      customerId: normalizedCustomerId.length > 0 ? normalizedCustomerId : null,
      customer: normalizedCustomer,
      shiftId: input.shiftId?.trim() || null,
      payment: {
        method: String(input.payment?.method ?? "")
          .trim()
          .toLowerCase(),
        amount: input.payment?.amount ?? Number.NaN,
      },
    };
}

function rowToCheckoutCustomer(row: CustomerRow): CheckoutCustomer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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

function rowToCheckoutPayment(row: PaymentRow): CheckoutPayment {
  return {
    id: row.id,
    orderId: row.orderId,
    method: toCheckoutPaymentMethod(row.method),
    amount: row.amount,
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
  customerRow: CustomerRow | null,
  paymentRow: PaymentRow,
): CheckoutOrder {
    return {
      id: row.id,
      ticketNumber: row.ticketNumber,
      customerId: row.customerId,
      shiftId: row.shiftId ?? null,
      total: row.total,
      createdAt: row.createdAt,
      customer: customerRow ? rowToCheckoutCustomer(customerRow) : null,
      items: itemRows.map((itemRow) =>
        rowToCheckoutOrderItem(
          itemRow,
          (modifierRowsByItem.get(itemRow.id) ?? []).map(rowToCheckoutOrderItemModifier),
        ),
      ),
      payment: rowToCheckoutPayment(paymentRow),
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

async function listCustomerRows(search: string): Promise<CustomerRow[]> {
  if (search.length === 0) {
    return db
      .select()
      .from(customers)
      .orderBy(desc(customers.updatedAt), desc(customers.createdAt))
      .limit(CUSTOMER_LIST_LIMIT.RECENT);
  }

  const pattern = `%${search}%`;

  return db
    .select()
    .from(customers)
    .where(or(like(customers.name, pattern), like(customers.phone, pattern), like(customers.address, pattern)))
    .orderBy(desc(customers.updatedAt), desc(customers.createdAt))
    .limit(CUSTOMER_LIST_LIMIT.SEARCH);
}

async function createCustomerRow(
  tx: DatabaseClient,
  customer: CheckoutCustomerInput,
  now: Date,
): Promise<CustomerRow> {
  const customerValues: CustomerInsert = {
    id: crypto.randomUUID(),
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    createdAt: now,
    updatedAt: now,
  };

  const [createdCustomer] = await tx.insert(customers).values(customerValues).returning();

  if (!createdCustomer) {
    throw new CheckoutPersistenceError(
      "dbError",
      { context: "Failed to load created customer" },
      "Failed to load created customer",
    );
  }

  return createdCustomer;
}

async function touchCustomerRow(tx: DatabaseClient, customerId: string, now: Date): Promise<CustomerRow> {
  const [updatedCustomer] = await tx
    .update(customers)
    .set({ updatedAt: now })
    .where(eq(customers.id, customerId))
    .returning();

  if (!updatedCustomer) {
    throw new CheckoutPersistenceError(
      "customerNotFound",
      { customerId },
      "Selected customer was not found",
    );
  }

  return updatedCustomer;
}

async function createOrderRow(
  tx: DatabaseClient,
  ticketNumber: number,
  customerId: string | null,
  shiftId: string | null,
  total: number,
  now: Date,
): Promise<OrderRow> {
  const orderValues: OrderInsert = {
    id: crypto.randomUUID(),
    ticketNumber,
    customerId,
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

async function createPaymentRow(
  tx: DatabaseClient,
  orderId: string,
  payment: CheckoutPaymentInput,
  now: Date,
): Promise<PaymentRow> {
  const paymentValues: PaymentInsert = {
    id: crypto.randomUUID(),
    orderId,
    method: payment.method,
    amount: payment.amount,
    createdAt: now,
  };

  const [createdPayment] = await tx.insert(payments).values(paymentValues).returning();

  if (!createdPayment) {
    throw new CheckoutPersistenceError(
      "dbError",
      { context: "Failed to load created payment" },
      "Failed to load created payment",
    );
  }

  return createdPayment;
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
  listCustomers(search?: string): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError> {
    const normalizedSearch = search?.trim() ?? "";

    return ResultAsync.fromPromise(
      listCustomerRows(normalizedSearch),
      wrapPersistenceError("Failed to list customers"),
    ).map((rows) => rows.map(rowToCheckoutCustomer));
  },

  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError> {
    const normalizedInput = normalizeCreateOrderInput(input);
    const validationError = validateCreateOrderInput(normalizedInput);
    if (validationError) {
      return errAsync(validationError);
    }

    const total = calculateOrderTotal(normalizedInput.items);
    const payment: CheckoutPaymentInput = {
      method: toCheckoutPaymentMethod(normalizedInput.payment.method),
      amount: normalizedInput.payment.amount,
    };

    return ResultAsync.fromPromise(
      withTransaction(async (tx) => {
        const now = new Date();
        const ticketNumber = await loadNextTicketNumber(tx);
        const customerRow = normalizedInput.customerId
          ? await touchCustomerRow(tx, normalizedInput.customerId, now)
          : normalizedInput.customer
            ? await createCustomerRow(tx, normalizedInput.customer, now)
            : null;
        const orderRow = await createOrderRow(tx, ticketNumber, customerRow?.id ?? null, normalizedInput.shiftId, total, now);
        const paymentRow = await createPaymentRow(tx, orderRow.id, payment, now);
        const orderItemRows = await createOrderItemRows(tx, orderRow.id, normalizedInput.items, now);
        await createOrderItemModifiers(tx, orderItemRows, normalizedInput.items, now);

        const orderItemModifierRows = await loadOrderItemModifierRows(tx, orderItemRows);

        return rowToCheckoutOrder(orderRow, orderItemRows, orderItemModifierRows, customerRow, paymentRow);
      }),
      wrapPersistenceError("Failed to create order"),
    );
  },
};
