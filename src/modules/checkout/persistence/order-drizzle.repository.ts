import { and, desc, eq, gte, like, lt, or } from "drizzle-orm";
import { errAsync, ResultAsync } from "neverthrow";

import { db, withTransaction, type DatabaseClient } from "@/shared/db/client";
import {
  customers,
  orderItems,
  orders,
  payments,
  products,
  type CustomerInsert,
  type CustomerRow,
  type OrderInsert,
  type OrderItemInsert,
  type OrderItemRow,
  type OrderRow,
  type PaymentInsert,
  type PaymentRow,
} from "@/shared/db/schema";
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
  type CheckoutPayment,
  type CheckoutPaymentInput,
  type CheckoutPaymentMethod,
  type CreateOrderInput,
} from "../domain/order";
import {
  type PosMetrics,
  type PosMetricsTopProduct,
} from "../domain/metrics";
import { CheckoutPersistenceError } from "../domain/errors";

export {
  CHECKOUT_FULFILLMENT_TYPE,
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutFulfillmentType,
  type CheckoutPaymentMethod,
  type CheckoutCustomerInput,
  type CreateOrderInput,
  type CheckoutCustomer,
  type CheckoutOrder,
} from "../domain/order";
export type { PosMetrics } from "../domain/metrics";
export { CheckoutPersistenceError } from "../domain/errors";

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
  deliveryPersonId: string | null;
  payment: NormalizedCheckoutPaymentInput;
}

interface TodayDateRange {
  start: Date;
  end: Date;
}

interface PosMetricOrderRow {
  total: number;
  paymentMethod: string | null;
}

interface PosMetricItemRow {
  productId: string;
  productName: string | null;
  quantity: number;
  unitPrice: number;
}

function formatUnknownError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function wrapPersistenceError(context: string) {
  return (cause: unknown) => {
    if (cause instanceof CheckoutPersistenceError) {
      return cause;
    }

    return new CheckoutPersistenceError(`${context}: ${formatUnknownError(cause)}`);
  };
}

function validateCustomerInput(customer: CheckoutCustomerInput): CheckoutPersistenceError | null {
  if (customer.name.trim().length === 0) {
    return new CheckoutPersistenceError("Customer name is required");
  }

  if (customer.phone.trim().length === 0) {
    return new CheckoutPersistenceError("Customer phone is required");
  }

  if (customer.address.trim().length === 0) {
    return new CheckoutPersistenceError("Customer address is required");
  }

  return null;
}

function isCheckoutPaymentMethod(value: string): value is CheckoutPaymentMethod {
  return CHECKOUT_PAYMENT_METHOD_VALUES.has(value as CheckoutPaymentMethod);
}

function toCheckoutPaymentMethod(value: string): CheckoutPaymentMethod {
  if (!isCheckoutPaymentMethod(value)) {
    throw new CheckoutPersistenceError("Payment method must be cash or card");
  }

  return value;
}

function validatePaymentInput(
  payment: NormalizedCheckoutPaymentInput,
  total: number,
): CheckoutPersistenceError | null {
  if (!isCheckoutPaymentMethod(payment.method)) {
    return new CheckoutPersistenceError("Payment method must be cash or card");
  }

  if (!Number.isInteger(payment.amount) || payment.amount < 0) {
    return new CheckoutPersistenceError("Payment amount must be a non-negative integer in cents");
  }

  if (payment.amount < total) {
    return new CheckoutPersistenceError("Payment amount must cover order total");
  }

  if (payment.method === CHECKOUT_PAYMENT_METHOD.CARD && payment.amount !== total) {
    return new CheckoutPersistenceError("Card payment amount must match order total");
  }

  return null;
}

function validateCreateOrderInput(input: NormalizedCreateOrderInput): CheckoutPersistenceError | null {
  if (input.items.length === 0) {
    return new CheckoutPersistenceError("Order must include at least one item");
  }

  for (const item of input.items) {
    if (item.productId.trim().length === 0) {
      return new CheckoutPersistenceError("Order item productId is required");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return new CheckoutPersistenceError("Order item quantity must be a positive integer");
    }

    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      return new CheckoutPersistenceError("Order item unitPrice must be a non-negative integer in cents");
    }
  }

  const total = calculateOrderTotal(input.items);
  const paymentError = validatePaymentInput(input.payment, total);
  if (paymentError) {
    return paymentError;
  }

  if (input.customerId && input.customer) {
    return new CheckoutPersistenceError("Provide either customerId or customer input, not both");
  }

  if (input.fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.LOCAL) {
    if (input.customerId || input.customer) {
      return new CheckoutPersistenceError("Local orders cannot include delivery customer data");
    }

    if (input.deliveryPersonId !== null) {
      return new CheckoutPersistenceError("Local orders cannot have a delivery person");
    }

    return null;
  }

  if (!input.customerId && !input.customer) {
    return new CheckoutPersistenceError("Delivery orders require a selected or new customer");
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
    })),
    fulfillmentType,
    customerId: normalizedCustomerId.length > 0 ? normalizedCustomerId : null,
    customer: normalizedCustomer,
    deliveryPersonId: input.deliveryPersonId?.trim() || null,
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

function rowToCheckoutOrderItem(row: OrderItemRow): CheckoutOrderItem {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
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

function rowToCheckoutOrder(
  row: OrderRow,
  itemRows: OrderItemRow[],
  customerRow: CustomerRow | null,
  paymentRow: PaymentRow,
): CheckoutOrder {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    customerId: row.customerId,
    deliveryPersonId: row.deliveryPersonId ?? null,
    total: row.total,
    createdAt: row.createdAt,
    customer: customerRow ? rowToCheckoutCustomer(customerRow) : null,
    items: itemRows.map(rowToCheckoutOrderItem),
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
    throw new CheckoutPersistenceError("Failed to load created customer");
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
    throw new CheckoutPersistenceError("Selected customer was not found");
  }

  return updatedCustomer;
}

async function createOrderRow(
  tx: DatabaseClient,
  ticketNumber: number,
  customerId: string | null,
  deliveryPersonId: string | null,
  total: number,
  now: Date,
): Promise<OrderRow> {
  const orderValues: OrderInsert = {
    id: crypto.randomUUID(),
    ticketNumber,
    customerId,
    deliveryPersonId,
    total,
    createdAt: now,
  };

  const [createdOrder] = await tx.insert(orders).values(orderValues).returning();

  if (!createdOrder) {
    throw new CheckoutPersistenceError("Failed to load created order");
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
    throw new CheckoutPersistenceError("Failed to load created payment");
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
    throw new CheckoutPersistenceError("Failed to load created order items");
  }

  return createdOrderItems;
}

function getTodayDateRange(referenceDate: Date = new Date()): TodayDateRange {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

async function listPosMetricOrderRows(start: Date, end: Date): Promise<PosMetricOrderRow[]> {
  return db
    .select({
      total: orders.total,
      paymentMethod: payments.method,
    })
    .from(orders)
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)));
}

async function listPosMetricItemRows(start: Date, end: Date): Promise<PosMetricItemRow[]> {
  return db
    .select({
      productId: orderItems.productId,
      productName: products.name,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(and(gte(orders.createdAt, start), lt(orders.createdAt, end)));
}

function buildPosMetrics(orderRows: PosMetricOrderRow[], itemRows: PosMetricItemRow[]): PosMetrics {
  const sales = orderRows.reduce((total, row) => total + row.total, 0);
  const tickets = orderRows.length;
  const averageTicket = tickets === 0 ? 0 : Math.round(sales / tickets);

  let cashSales = 0;
  let cardSales = 0;

  for (const row of orderRows) {
    const paymentMethod = row.paymentMethod?.trim().toLowerCase() ?? "";
    if (!isCheckoutPaymentMethod(paymentMethod)) {
      continue;
    }

    if (paymentMethod === CHECKOUT_PAYMENT_METHOD.CASH) {
      cashSales += row.total;
      continue;
    }

    if (paymentMethod === CHECKOUT_PAYMENT_METHOD.CARD) {
      cardSales += row.total;
    }
  }

  let itemsSold = 0;
  const topProductById = new Map<string, PosMetricsTopProduct>();

  for (const row of itemRows) {
    itemsSold += row.quantity;

    const currentProduct = topProductById.get(row.productId);
    const productSales = row.quantity * row.unitPrice;

    if (currentProduct) {
      currentProduct.quantitySold += row.quantity;
      currentProduct.sales += productSales;
      continue;
    }

    topProductById.set(row.productId, {
      productId: row.productId,
      productName: row.productName ?? "Producto",
      quantitySold: row.quantity,
      sales: productSales,
    });
  }

  const topProducts = [...topProductById.values()]
    .sort(
      (left, right) =>
        right.quantitySold - left.quantitySold ||
        right.sales - left.sales ||
        left.productName.localeCompare(right.productName, "es-AR"),
    )
    .slice(0, 3);

  return {
    sales,
    tickets,
    averageTicket,
    itemsSold,
    paymentBreakdown: {
      cashSales,
      cardSales,
    },
    topProducts,
    updatedAt: new Date(),
  };
}

export const orderDrizzleRepository = {
  getTodayMetrics(): ResultAsync<PosMetrics, CheckoutPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const todayDateRange = getTodayDateRange();
        const [orderRows, itemRows] = await Promise.all([
          listPosMetricOrderRows(todayDateRange.start, todayDateRange.end),
          listPosMetricItemRows(todayDateRange.start, todayDateRange.end),
        ]);

        return buildPosMetrics(orderRows, itemRows);
      })(),
      wrapPersistenceError("Failed to load POS metrics"),
    );
  },

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
        const orderRow = await createOrderRow(tx, ticketNumber, customerRow?.id ?? null, normalizedInput.deliveryPersonId, total, now);
        const paymentRow = await createPaymentRow(tx, orderRow.id, payment, now);
        const orderItemRows = await createOrderItemRows(tx, orderRow.id, normalizedInput.items, now);

        return rowToCheckoutOrder(orderRow, orderItemRows, customerRow, paymentRow);
      }),
      wrapPersistenceError("Failed to create order"),
    );
  },
};
