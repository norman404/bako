import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { db } from "@/db/client";
import { orders, payments, shifts } from "@/db/schema";

import { MetricsPersistenceError } from "./errors";
import type {
  ActiveShiftSummary,
  TodayMetrics,
  TodayMetricsPaymentBreakdown,
} from "./metrics";
import type { MetricsRepository } from "./ports";

interface TodayDateRange {
  start: Date;
  end: Date;
}

interface MetricsOrderRow {
  id: string;
  total: number;
}

interface MetricsPaymentRow {
  method: string;
  amount: number;
}

interface ActiveShiftRow {
  id: string;
  openedAt: Date;
}

function getTodayDateRange(referenceDate: Date = new Date()): TodayDateRange {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function formatUnknownError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function buildPaymentBreakdown(paymentRows: MetricsPaymentRow[]): TodayMetricsPaymentBreakdown {
  return paymentRows.reduce<TodayMetricsPaymentBreakdown>(
    (breakdown, payment) => {
      const method = payment.method.trim().toLowerCase();

      if (method === "cash") {
        breakdown.cash += payment.amount;
      } else if (method === "card") {
        breakdown.card += payment.amount;
      } else {
        breakdown.other += payment.amount;
      }

      return breakdown;
    },
    { cash: 0, card: 0, other: 0 },
  );
}

function buildActiveShiftSummary(
  activeShift: ActiveShiftRow | null,
  shiftOrders: MetricsOrderRow[],
): ActiveShiftSummary | null {
  if (!activeShift) return null;

  return {
    openedAt: activeShift.openedAt,
    totalOrders: shiftOrders.length,
    totalSales: shiftOrders.reduce((total, order) => total + order.total, 0),
  };
}

async function listTodayOrders(range: TodayDateRange): Promise<MetricsOrderRow[]> {
  return db
    .select({ id: orders.id, total: orders.total })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, range.start),
        lt(orders.createdAt, range.end),
        isNull(orders.voidedAt),
      ),
    );
}

async function listPayments(orderIds: string[]): Promise<MetricsPaymentRow[]> {
  if (orderIds.length === 0) return [];

  return db
    .select({ method: payments.method, amount: payments.amount })
    .from(payments)
    .where(inArray(payments.orderId, orderIds));
}

async function findActiveShift(): Promise<ActiveShiftRow | null> {
  const rows = await db
    .select({ id: shifts.id, openedAt: shifts.openedAt })
    .from(shifts)
    .where(eq(shifts.status, "active"))
    .limit(1);

  return rows[0] ?? null;
}

async function listActiveShiftOrders(shiftId: string | null): Promise<MetricsOrderRow[]> {
  if (!shiftId) return [];

  return db
    .select({ id: orders.id, total: orders.total })
    .from(orders)
    .where(and(eq(orders.shiftId, shiftId), isNull(orders.voidedAt)));
}

async function loadTodayMetrics(): Promise<TodayMetrics> {
  const range = getTodayDateRange();
  const [todayOrders, activeShift] = await Promise.all([
    listTodayOrders(range),
    findActiveShift(),
  ]);
  const [paymentRows, activeShiftOrders] = await Promise.all([
    listPayments(todayOrders.map((order) => order.id)),
    listActiveShiftOrders(activeShift?.id ?? null),
  ]);
  const sales = todayOrders.reduce((total, order) => total + order.total, 0);
  const totalOrders = todayOrders.length;

  return {
    sales,
    totalOrders,
    averageTicket: totalOrders === 0 ? 0 : Math.round(sales / totalOrders),
    paymentBreakdown: buildPaymentBreakdown(paymentRows),
    activeShift: buildActiveShiftSummary(activeShift, activeShiftOrders),
  };
}

export const metricsDrizzleRepository: MetricsRepository = {
  getTodayMetrics(): ResultAsync<TodayMetrics, MetricsPersistenceError> {
    return ResultAsync.fromPromise(
      loadTodayMetrics(),
      (cause) => new MetricsPersistenceError(
        { cause: formatUnknownError(cause) },
        `Failed to load today metrics: ${formatUnknownError(cause)}`,
      ),
    );
  },
};
