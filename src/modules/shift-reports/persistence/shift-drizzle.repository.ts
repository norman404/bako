import { asc, eq, inArray } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { db } from "@/shared/db/client";
import { orderItems, orders, payments, products, shifts, type ShiftRow } from "@/shared/db/schema";
import { ShiftPersistenceError } from "../domain/errors";
import type { ShiftRepository } from "../domain/ports";
import type { Shift, ShiftHistoryItem, ShiftReport, ShiftReportOrder } from "../domain/shift";

function wrapDbError(context: string) {
  return (cause: unknown) => {
    if (cause instanceof ShiftPersistenceError) {
      return cause;
    }
    return new ShiftPersistenceError("dbError", { context, cause: String(cause) }, `${context}: ${String(cause)}`);
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
          throw new ShiftPersistenceError("shiftAlreadyActive");
        }

        const now = new Date();
        const id = crypto.randomUUID();
        const [created] = await db
          .insert(shifts)
          .values({ id, openedAt: now, status: "active", closedAt: null })
          .returning();

        if (!created) {
          throw new ShiftPersistenceError("dbError", { context: "Failed to create shift" });
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
          throw new ShiftPersistenceError("shiftNotFound", { shiftId });
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
          throw new ShiftPersistenceError("shiftNotFound", { shiftId });
        }

        // Load all orders for the shift with their payment method.
        const orderRows = await db
          .select({
            orderId: orders.id,
            ticketNumber: orders.ticketNumber,
            orderTotal: orders.total,
            createdAt: orders.createdAt,
            method: payments.method,
          })
          .from(orders)
          .leftJoin(payments, eq(payments.orderId, orders.id))
          .where(eq(orders.shiftId, shiftId))
          .orderBy(asc(orders.createdAt));

        // Load items for those orders joined with product names.
        const orderIds = orderRows.map((row) => row.orderId);
        const itemRows =
          orderIds.length === 0
            ? []
            : await db
                .select({
                  orderId: orderItems.orderId,
                  productId: orderItems.productId,
                  productName: products.name,
                  quantity: orderItems.quantity,
                  unitPrice: orderItems.unitPrice,
                })
                .from(orderItems)
                .leftJoin(products, eq(products.id, orderItems.productId))
                .where(inArray(orderItems.orderId, orderIds));

        const itemsByOrder = new Map<string, typeof itemRows>();
        for (const item of itemRows) {
          const list = itemsByOrder.get(item.orderId) ?? [];
          list.push(item);
          itemsByOrder.set(item.orderId, list);
        }

        let totalSales = 0;
        let cashTotal = 0;
        let cardTotal = 0;
        let totalItems = 0;
        const reportOrders: ShiftReportOrder[] = [];

        for (const orderRow of orderRows) {
          totalSales += orderRow.orderTotal;

          const method = orderRow.method?.trim().toLowerCase() ?? "";
          if (method === "cash") {
            cashTotal += orderRow.orderTotal;
          } else if (method === "card") {
            cardTotal += orderRow.orderTotal;
          }

          const orderItemsList = itemsByOrder.get(orderRow.orderId) ?? [];
          const itemCount = orderItemsList.reduce((sum, item) => sum + item.quantity, 0);
          totalItems += itemCount;

          reportOrders.push({
            orderId: orderRow.orderId,
            ticketNumber: orderRow.ticketNumber,
            createdAt: orderRow.createdAt,
            total: orderRow.orderTotal,
            paymentMethod: orderRow.method ?? "",
            itemCount,
            items: orderItemsList.map((item) => ({
              productId: item.productId,
              productName: item.productName ?? "",
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          });
        }

        return {
          shiftId: shift.id,
          openedAt: shift.openedAt,
          closedAt: shift.closedAt ?? null,
          totalOrders: orderRows.length,
          totalItems,
          totalSales,
          cashTotal,
          cardTotal,
          orders: reportOrders,
        };
      })(),
      wrapDbError("Failed to get shift report"),
    );
  },
};
