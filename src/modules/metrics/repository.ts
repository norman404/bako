import { and, eq, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { withTransaction, type DatabaseClient } from "@/db/client";
import { categories, orderItems, orders, payments, products, shifts } from "@/db/schema";

import { MetricsPersistenceError } from "./errors";
import { aggregateSalesMetrics, type MetricsDateRange, type SalesItemRow, type SalesMetrics, type SalesOrderRow } from "./metrics";
import type { MetricsRepository } from "./ports";

function message(cause: unknown) { return cause instanceof Error ? cause.message : String(cause); }

async function listOrders(db: DatabaseClient, range: MetricsDateRange, voided: boolean): Promise<SalesOrderRow[]> {
  const rows = await db.select({ id: orders.id, total: orders.total, createdAt: orders.confirmedAt, shiftId: orders.financialShiftId, channel: orders.channel }).from(orders)
    .where(and(gte(orders.confirmedAt, range.start), lt(orders.confirmedAt, range.end), voided ? isNotNull(orders.voidedAt) : isNull(orders.voidedAt)));
  return rows.flatMap((row) => row.createdAt ? [{ ...row, createdAt: row.createdAt }] : []);
}

async function listItems(db: DatabaseClient, range: MetricsDateRange): Promise<SalesItemRow[]> {
  return db.select({ orderId: orderItems.orderId, productId: orderItems.productId, productName: sql<string>`coalesce(${products.name}, 'Producto eliminado')`, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice, unitCost: orderItems.unitCost, categoryId: products.categoryId, categoryName: categories.name })
    .from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).leftJoin(products, eq(orderItems.productId, products.id)).leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(gte(orders.confirmedAt, range.start), lt(orders.confirmedAt, range.end), isNull(orders.voidedAt)));
}

async function load(range: MetricsDateRange): Promise<SalesMetrics> {
  return withTransaction(async (db) => {
    const duration = range.end.getTime() - range.start.getTime();
    const previous = { start: new Date(range.start.getTime() - duration), end: new Date(range.start) };
    const currentOrders = await listOrders(db, range, false);
    const currentItems = await listItems(db, range);
    const previousOrders = await listOrders(db, previous, false);
    const previousItems = await listItems(db, previous);
    const paymentRows = await db.select({ method: payments.method, amount: payments.amount })
      .from(payments).innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(gte(orders.confirmedAt, range.start), lt(orders.confirmedAt, range.end), isNull(orders.voidedAt)));
    const voidedOrders = await listOrders(db, range, true);
    const shiftRows = await db.select({ id: shifts.id, openedAt: shifts.openedAt, closedAt: shifts.closedAt, cashDifference: shifts.cashDifference })
      .from(shifts).where(and(gte(shifts.openedAt, range.start), lt(shifts.openedAt, range.end)));
    return aggregateSalesMetrics(range, currentOrders, currentItems, previousOrders, previousItems, paymentRows, voidedOrders, shiftRows);
  });
}

export const metricsDrizzleRepository: MetricsRepository = {
  getSalesMetrics(range) {
    return ResultAsync.fromPromise(load(range), (cause) => new MetricsPersistenceError({ cause: message(cause) }, `Failed to load sales metrics: ${message(cause)}`));
  },
};
