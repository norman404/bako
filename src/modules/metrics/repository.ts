import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { withTransaction, type DatabaseClient } from "@/db/client";
import { orderItems, orders, payments, products } from "@/db/schema";

import { MetricsPersistenceError } from "./errors";
import { aggregateSalesMetrics, type MetricsDateRange, type SalesItemRow, type SalesMetrics, type SalesOrderRow } from "./metrics";
import type { MetricsRepository } from "./ports";

function message(cause: unknown) { return cause instanceof Error ? cause.message : String(cause); }

async function listOrders(db: DatabaseClient, range: MetricsDateRange): Promise<SalesOrderRow[]> {
  const rows = await db.select({ id: orders.id, total: orders.total, createdAt: orders.confirmedAt, channel: orders.channel }).from(orders)
    .where(and(gte(orders.confirmedAt, range.start), lt(orders.confirmedAt, range.end), isNull(orders.voidedAt)));
  return rows.flatMap((row) => row.createdAt ? [{ ...row, createdAt: row.createdAt }] : []);
}

async function listItems(db: DatabaseClient, range: MetricsDateRange): Promise<SalesItemRow[]> {
  return db.select({ orderId: orderItems.orderId, productId: orderItems.productId, productName: sql<string>`coalesce(${products.name}, 'Producto eliminado')`, quantity: orderItems.quantity, unitPrice: orderItems.unitPrice })
    .from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).leftJoin(products, eq(orderItems.productId, products.id))
    .where(and(gte(orders.confirmedAt, range.start), lt(orders.confirmedAt, range.end), isNull(orders.voidedAt)));
}

async function load(range: MetricsDateRange): Promise<SalesMetrics> {
  return withTransaction(async (db) => {
    const currentOrders = await listOrders(db, range);
    const currentItems = await listItems(db, range);
    const paymentRows = await db.select({ method: payments.method, amount: payments.amount })
      .from(payments).innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(gte(orders.confirmedAt, range.start), lt(orders.confirmedAt, range.end), isNull(orders.voidedAt)));
    return aggregateSalesMetrics(range, currentOrders, currentItems, paymentRows);
  });
}

export const metricsDrizzleRepository: MetricsRepository = {
  getSalesMetrics(range) {
    return ResultAsync.fromPromise(load(range), (cause) => new MetricsPersistenceError({ cause: message(cause) }, `Failed to load sales metrics: ${message(cause)}`));
  },
};
