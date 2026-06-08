import { eq } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { db } from "@/shared/db/client";
import { orders, payments, shifts, type ShiftRow } from "@/shared/db/schema";
import { ShiftPersistenceError } from "../domain/errors";
import type { ShiftRepository } from "../domain/ports";
import type { Shift, ShiftHistoryItem, ShiftReport } from "../domain/shift";

function wrapDbError(context: string) {
  return (cause: unknown) => {
    if (cause instanceof ShiftPersistenceError) {
      return cause;
    }
    return new ShiftPersistenceError(`${context}: ${String(cause)}`);
  };
}

function rowToShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    openedAt: row.openedAt,
    closedAt: row.closedAt ?? null,
    status: row.status as Shift["status"],
  };
}

export const shiftDrizzleRepository: ShiftRepository = {
  openShift(): ResultAsync<Shift, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const activeRows = await db.select().from(shifts).where(eq(shifts.status, "active")).limit(1);
        if (activeRows.length > 0) {
          throw new ShiftPersistenceError("Already have an active shift");
        }

        const now = new Date();
        const id = crypto.randomUUID();
        const [created] = await db
          .insert(shifts)
          .values({ id, openedAt: now, status: "active", closedAt: null })
          .returning();

        if (!created) {
          throw new ShiftPersistenceError("Failed to create shift");
        }

        return rowToShift(created);
      })(),
      wrapDbError("Failed to open shift"),
    );
  },

  closeShift(shiftId: string): ResultAsync<Shift, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const now = new Date();
        const [updated] = await db
          .update(shifts)
          .set({ closedAt: now, status: "closed" })
          .where(eq(shifts.id, shiftId))
          .returning();

        if (!updated) {
          throw new ShiftPersistenceError("Shift not found");
        }

        return rowToShift(updated);
      })(),
      wrapDbError("Failed to close shift"),
    );
  },

  getActive(): ResultAsync<Shift | null, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const rows = await db.select().from(shifts).where(eq(shifts.status, "active")).limit(1);
        const row = rows[0];
        return row ? rowToShift(row) : null;
      })(),
      wrapDbError("Failed to get active shift"),
    );
  },

  listHistory(): ResultAsync<ShiftHistoryItem[], ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const shiftRows = await db.select().from(shifts);
        const orderRows = await db.select().from(orders);

        const ordersByShift = new Map<string, Array<{ total: number }>>();
        for (const order of orderRows) {
          if (!order.shiftId) continue;
          const list = ordersByShift.get(order.shiftId) ?? [];
          list.push(order);
          ordersByShift.set(order.shiftId, list);
        }

        return shiftRows.map((shift) => {
          const shiftOrders = ordersByShift.get(shift.id) ?? [];
          return {
            shiftId: shift.id,
            openedAt: shift.openedAt,
            closedAt: shift.closedAt ?? null,
            totalOrders: shiftOrders.length,
            totalSales: shiftOrders.reduce((sum, o) => sum + o.total, 0),
          };
        });
      })(),
      wrapDbError("Failed to list shift history"),
    );
  },

  getReport(shiftId: string): ResultAsync<ShiftReport, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const shiftRows = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
        const shift = shiftRows[0];
        if (!shift) {
          throw new ShiftPersistenceError("Shift not found");
        }

        // Join orders + payments to get order totals grouped by payment method
        const rows = await db
          .select({
            orderId: orders.id,
            orderTotal: orders.total,
            method: payments.method,
          })
          .from(orders)
          .innerJoin(payments, eq(payments.orderId, orders.id))
          .where(eq(orders.shiftId, shiftId));

        let totalSales = 0;
        let totalOrders = 0;
        let cashTotal = 0;
        let cardTotal = 0;
        const countedOrders = new Set<string>();

        for (const row of rows) {
          // Count each order only once
          if (!countedOrders.has(row.orderId)) {
            countedOrders.add(row.orderId);
            totalOrders += 1;
            totalSales += row.orderTotal;
          }

          const method = row.method?.trim().toLowerCase() ?? "";
          if (method === "cash") {
            cashTotal += row.orderTotal;
          } else if (method === "card") {
            cardTotal += row.orderTotal;
          }
        }

        return {
          shiftId: shift.id,
          openedAt: shift.openedAt,
          closedAt: shift.closedAt ?? null,
          totalOrders,
          totalSales,
          cashTotal,
          cardTotal,
        };
      })(),
      wrapDbError("Failed to get shift report"),
    );
  },
};
