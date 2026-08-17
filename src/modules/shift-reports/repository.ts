import { asc, eq, inArray } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { db, withTransaction } from "@/db/client";
import {
  cashMovements,
  customers,
  orderItems,
  orderItemModifiers,
  orders,
  payments,
  products,
  shifts,
  type CashMovementRow,
  type ShiftRow,
} from "@/db/schema";
import { ShiftPersistenceError } from "./errors";
import type { ShiftRepository } from "./ports";
import type {
  CashMovement,
  CashMovementInput,
  CashMovementType,
  Shift,
  ShiftHistoryItem,
  ShiftReport,
  ShiftReportOrder,
  UpdateCashMovementInput,
} from "./shift";
import type { OrderDetail, OrderDetailItem, OrderDetailItemModifier, UpdateOrderInput } from "./order-management";

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
    openingCash: row.openingCash ?? 0,
    countedCash: row.countedCash ?? null,
    cashDifference: row.cashDifference ?? null,
  };
}

function rowToCashMovement(row: CashMovementRow): CashMovement {
  return {
    id: row.id,
    shiftId: row.shiftId,
    type: row.type as CashMovementType,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.createdAt,
  };
}

async function queryOrderDetail(orderId: string): Promise<OrderDetail> {
  const orderRows = await db
    .select({
      id: orders.id,
      ticketNumber: orders.ticketNumber,
      createdAt: orders.createdAt,
      total: orders.total,
      voidedAt: orders.voidedAt,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      paymentMethod: payments.method,
      paymentAmount: payments.amount,
    })
    .from(orders)
    .leftJoin(payments, eq(payments.orderId, orders.id))
    .leftJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, orderId))
    .limit(1);

  const orderRow = orderRows[0];
  if (!orderRow) {
    throw new ShiftPersistenceError("orderNotFound", { orderId });
  }

  // Load items with modifiers
  const itemRows = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      categoryId: products.categoryId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
    })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, orderId));

  const itemIds = itemRows.map((r) => r.id);
  const modifierRows =
    itemIds.length === 0
      ? []
      : await db
          .select({
            itemId: orderItemModifiers.orderItemId,
            groupId: orderItemModifiers.groupId,
            groupName: orderItemModifiers.groupName,
            optionId: orderItemModifiers.optionId,
            optionName: orderItemModifiers.optionName,
            textValue: orderItemModifiers.textValue,
            priceDelta: orderItemModifiers.priceDelta,
          })
          .from(orderItemModifiers)
          .where(inArray(orderItemModifiers.orderItemId, itemIds));

  const modifiersByItem = new Map<string, OrderDetailItemModifier[]>();
  for (const mod of modifierRows) {
    const list = modifiersByItem.get(mod.itemId) ?? [];
    list.push({
      groupId: mod.groupId,
      groupName: mod.groupName,
      optionId: mod.optionId,
      optionName: mod.optionName,
      textValue: mod.textValue,
      priceDelta: mod.priceDelta,
    });
    modifiersByItem.set(mod.itemId, list);
  }

  const items: OrderDetailItem[] = itemRows.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName ?? "",
    categoryId: item.categoryId ?? null,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    modifiers: modifiersByItem.get(item.id) ?? [],
  }));

  return {
    id: orderRow.id,
    ticketNumber: orderRow.ticketNumber,
    createdAt: orderRow.createdAt,
    total: orderRow.total,
    paymentMethod: orderRow.paymentMethod ?? "",
    paymentAmount: orderRow.paymentAmount ?? 0,
    fulfillmentType: orderRow.customerId ? "delivery" : "local",
    customer:
      orderRow.customerId && orderRow.customerName
        ? {
            id: orderRow.customerId,
            name: orderRow.customerName,
            phone: orderRow.customerPhone ?? "",
            address: orderRow.customerAddress ?? "",
          }
        : null,
    items,
    isVoided: orderRow.voidedAt !== null,
    voidedAt: orderRow.voidedAt ?? null,
  };
}

export const shiftDrizzleRepository: ShiftRepository = {
  openShift(openingCash: number): ResultAsync<Shift, ShiftPersistenceError> {
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
          .values({ id, openedAt: now, status: "active", closedAt: null, openingCash })
          .returning();

        if (!created) {
          throw new ShiftPersistenceError("dbError", { context: "Failed to create shift" });
        }

        return rowToShift(created);
      })(),
      wrapDbError("Failed to open shift"),
    );
  },

  closeShift(shiftId: string, countedCash: number): ResultAsync<Shift, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const shiftRows = await db.select().from(shifts).where(eq(shifts.id, shiftId)).limit(1);
        const shift = shiftRows[0];
        if (!shift) {
          throw new ShiftPersistenceError("shiftNotFound", { shiftId });
        }

        const openingCash = shift.openingCash ?? 0;

        const orderRows = await db
          .select({
            orderTotal: orders.total,
            voidedAt: orders.voidedAt,
            method: payments.method,
          })
          .from(orders)
          .leftJoin(payments, eq(payments.orderId, orders.id))
          .where(eq(orders.shiftId, shiftId))
          .orderBy(asc(orders.createdAt));

        let cashSales = 0;
        for (const row of orderRows) {
          if (row.voidedAt !== null) continue;
          const method = row.method?.trim().toLowerCase() ?? "";
          if (method === "cash") {
            cashSales += row.orderTotal;
          }
        }

        const movementRows = await db.select().from(cashMovements).where(eq(cashMovements.shiftId, shiftId));
        const totalIncome = movementRows
          .filter((m) => m.type === "income")
          .reduce((sum, m) => sum + m.amount, 0);
        const totalExpense = movementRows
          .filter((m) => m.type === "expense")
          .reduce((sum, m) => sum + m.amount, 0);

        const expectedCash = openingCash + cashSales + totalIncome - totalExpense;
        const cashDifference = countedCash - expectedCash;

        const now = new Date();
        const [updated] = await db
          .update(shifts)
          .set({ closedAt: now, status: "closed", countedCash, cashDifference })
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
          if (order.voidedAt !== null) continue;
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
            openingCash: shift.openingCash ?? 0,
            cashDifference: shift.cashDifference ?? null,
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
            voidedAt: orders.voidedAt,
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

        let totalOrders = 0;
        let totalSales = 0;
        let cashTotal = 0;
        let cardTotal = 0;
        let totalItems = 0;
        const reportOrders: ShiftReportOrder[] = [];

        for (const orderRow of orderRows) {
          const isVoided = orderRow.voidedAt !== null;
          const orderItemsList = itemsByOrder.get(orderRow.orderId) ?? [];
          const itemCount = orderItemsList.reduce((sum, item) => sum + item.quantity, 0);

          if (!isVoided) {
            totalOrders += 1;
            totalSales += orderRow.orderTotal;
            totalItems += itemCount;

            const method = orderRow.method?.trim().toLowerCase() ?? "";
            if (method === "cash") {
              cashTotal += orderRow.orderTotal;
            } else if (method === "card") {
              cardTotal += orderRow.orderTotal;
            }
          }

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
            isVoided,
          });
        }

        const movementRows = await db.select().from(cashMovements).where(eq(cashMovements.shiftId, shiftId));
        const cashMovementsIn = movementRows
          .filter((m) => m.type === "income")
          .reduce((sum, m) => sum + m.amount, 0);
        const cashMovementsOut = movementRows
          .filter((m) => m.type === "expense")
          .reduce((sum, m) => sum + m.amount, 0);
        const openingCash = shift.openingCash ?? 0;
        const expectedCash = openingCash + cashTotal + cashMovementsIn - cashMovementsOut;
        const countedCash = shift.countedCash ?? null;
        const cashDifference = shift.cashDifference ?? null;

        return {
          shiftId: shift.id,
          openedAt: shift.openedAt,
          closedAt: shift.closedAt ?? null,
          totalOrders,
          totalItems,
          totalSales,
          cashTotal,
          cardTotal,
          orders: reportOrders,
          openingCash,
          cashMovementsIn,
          cashMovementsOut,
          expectedCash,
          countedCash,
          cashDifference,
          cashMovements: movementRows.map(rowToCashMovement),
        };
      })(),
      wrapDbError("Failed to get shift report"),
    );
  },

  getOrderDetail(orderId: string): ResultAsync<OrderDetail, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      queryOrderDetail(orderId),
      wrapDbError("Failed to get order detail"),
    );
  },

  voidOrder(orderId: string): ResultAsync<void, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const existing = await db
          .select({ id: orders.id, voidedAt: orders.voidedAt })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        const order = existing[0];
        if (!order) {
          throw new ShiftPersistenceError("orderNotFound", { orderId });
        }

        if (order.voidedAt !== null) {
          throw new ShiftPersistenceError("orderAlreadyVoided", { orderId });
        }

        const now = new Date();
        await db
          .update(orders)
          .set({ voidedAt: now })
          .where(eq(orders.id, orderId));
      })(),
      wrapDbError("Failed to void order"),
    );
  },

  updateOrder(
    orderId: string,
    input: UpdateOrderInput,
  ): ResultAsync<OrderDetail, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        // Verify order exists and is not voided
        const existing = await db
          .select({ id: orders.id, voidedAt: orders.voidedAt })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

        const order = existing[0];
        if (!order) {
          throw new ShiftPersistenceError("orderNotFound", { orderId });
        }

        if (order.voidedAt !== null) {
          throw new ShiftPersistenceError("orderAlreadyVoided", { orderId });
        }

        const newTotal = input.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        );

        await withTransaction(async (tx) => {
          // Delete old items and modifiers
          const oldItems = await tx
            .select({ id: orderItems.id })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

          const oldItemIds = oldItems.map((r) => r.id);
          if (oldItemIds.length > 0) {
            await tx
              .delete(orderItemModifiers)
              .where(inArray(orderItemModifiers.orderItemId, oldItemIds));
            await tx
              .delete(orderItems)
              .where(inArray(orderItems.id, oldItemIds));
          }

          // Insert new items sequentially. `tx` (unlike `db`) does not go through
          // `runExclusive` per-query — it relies on the caller awaiting one query
          // at a time. The sqlite-proxy driver over @tauri-apps/plugin-sql has a
          // single connection and cannot run concurrent writes inside the same
          // transaction: firing these with Promise.all hangs the transaction
          // (COMMIT never happens) instead of throwing, so it must stay a loop.
          const now = new Date();
          for (const itemInput of input.items) {
            const itemId = crypto.randomUUID();
            // eslint-disable-next-line no-await-in-loop -- see comment above
            await tx.insert(orderItems).values({
              id: itemId,
              orderId,
              productId: itemInput.productId,
              quantity: itemInput.quantity,
              unitPrice: itemInput.unitPrice,
              createdAt: now,
            });

            for (const mod of itemInput.modifiers) {
              // eslint-disable-next-line no-await-in-loop -- see comment above
              await tx.insert(orderItemModifiers).values({
                id: crypto.randomUUID(),
                orderItemId: itemId,
                groupId: mod.groupId,
                groupName: mod.groupName,
                optionId: mod.optionId,
                optionName: mod.optionName ?? "",
                priceDelta: mod.priceDelta,
                textValue: mod.textValue,
                createdAt: now,
              });
            }
          }

          // Update payment
          await tx
            .update(payments)
            .set({
              method: input.payment.method,
              amount: input.payment.amount,
            })
            .where(eq(payments.orderId, orderId));

          // Update order total
          await tx
            .update(orders)
            .set({ total: newTotal })
            .where(eq(orders.id, orderId));
        });

        // Return updated order detail
        return await queryOrderDetail(orderId);
      })(),
      wrapDbError("Failed to update order"),
    );
  },

  addCashMovement(shiftId: string, input: CashMovementInput): ResultAsync<CashMovement, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const now = new Date();
        const id = crypto.randomUUID();
        const [created] = await db
          .insert(cashMovements)
          .values({
            id,
            shiftId,
            type: input.type,
            amount: input.amount,
            reason: input.reason,
            createdAt: now,
          })
          .returning();

        if (!created) {
          throw new ShiftPersistenceError("dbError", { context: "Failed to create cash movement" });
        }

        return rowToCashMovement(created);
      })(),
      wrapDbError("Failed to add cash movement"),
    );
  },

  updateCashMovement(id: string, input: UpdateCashMovementInput): ResultAsync<CashMovement, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const set: Record<string, unknown> = {};
        if (input.amount !== undefined) set.amount = input.amount;
        if (input.reason !== undefined) set.reason = input.reason;

        const [updated] = await db
          .update(cashMovements)
          .set(set)
          .where(eq(cashMovements.id, id))
          .returning();

        if (!updated) {
          throw new ShiftPersistenceError("cashMovementNotFound", { id });
        }

        return rowToCashMovement(updated);
      })(),
      wrapDbError("Failed to update cash movement"),
    );
  },

  deleteCashMovement(id: string): ResultAsync<void, ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        await db.delete(cashMovements).where(eq(cashMovements.id, id));
      })(),
      wrapDbError("Failed to delete cash movement"),
    );
  },

  listCashMovements(shiftId: string): ResultAsync<CashMovement[], ShiftPersistenceError> {
    return ResultAsync.fromPromise(
      (async () => {
        const rows = await db
          .select()
          .from(cashMovements)
          .where(eq(cashMovements.shiftId, shiftId))
          .orderBy(asc(cashMovements.createdAt));
        return rows.map(rowToCashMovement);
      })(),
      wrapDbError("Failed to list cash movements"),
    );
  },
};
