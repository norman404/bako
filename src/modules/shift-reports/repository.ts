import { asc, desc, eq, inArray } from "drizzle-orm";
import { ResultAsync } from "neverthrow";

import { db, withTransaction } from "@/db/client";
import {
  categories,
  cashMovements,
  orderItems,
  orderItemModifiers,
  orders,
  payments,
  products,
  shifts,
  type CashMovementRow,
  type PaymentRow,
  type ShiftRow,
} from "@/db/schema";
import { ShiftPersistenceError } from "./errors";
import { aggregateCategorySales } from "./lib/category-sales";
import type { ShiftRepository } from "./ports";
import type {
  CashMovement,
  CashMovementInput,
  CashMovementType,
  Shift,
  ShiftHistoryItem,
  ShiftReport,
  ShiftReportOrder,
  ShiftReportPayment,
  UpdateCashMovementInput,
} from "./shift";
import type {
  OrderDetail,
  OrderDetailItem,
  OrderDetailItemModifier,
  OrderDetailPayment,
  UpdateOrderInput,
  UpdateOrderPaymentInput,
} from "./order-management";

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

function rowToOrderPayment(row: PaymentRow): OrderDetailPayment {
  return {
    id: row.id,
    method: row.method,
    amount: row.amount,
    cashReceived: row.cashReceived ?? null,
    createdAt: row.createdAt,
  };
}

function rowToReportPayment(row: PaymentRow): ShiftReportPayment {
  return {
    method: row.method,
    amount: row.amount,
    cashReceived: row.cashReceived ?? null,
  };
}

function groupPaymentsByOrder(rows: PaymentRow[]): Map<string, PaymentRow[]> {
  return rows.reduce((grouped, row) => {
    const orderPayments = grouped.get(row.orderId) ?? [];
    orderPayments.push(row);
    grouped.set(row.orderId, orderPayments);
    return grouped;
  }, new Map<string, PaymentRow[]>());
}

function validateUpdatePayments(
  paymentInputs: UpdateOrderPaymentInput[],
  total: number,
): ShiftPersistenceError | null {
  if (paymentInputs.length === 0) {
    return new ShiftPersistenceError("invalidOrderPayment");
  }

  const methods = new Set<string>();
  let appliedTotal = 0;

  for (const payment of paymentInputs) {
    const method = payment.method.trim().toLowerCase();
    if (method !== "cash" && method !== "card") {
      return new ShiftPersistenceError("invalidOrderPayment");
    }

    if (methods.has(method)) {
      return new ShiftPersistenceError("invalidOrderPayment");
    }
    methods.add(method);

    if (!Number.isInteger(payment.amount) || payment.amount < 0) {
      return new ShiftPersistenceError("invalidOrderPayment");
    }

    if (paymentInputs.length > 1 && payment.amount === 0) {
      return new ShiftPersistenceError("invalidOrderPayment");
    }

    if (method === "cash") {
      if (
        payment.cashReceived === null ||
        !Number.isInteger(payment.cashReceived) ||
        payment.cashReceived < payment.amount
      ) {
        return new ShiftPersistenceError("invalidOrderPayment");
      }

      if (paymentInputs.length > 1 && payment.cashReceived !== payment.amount) {
        return new ShiftPersistenceError("invalidOrderPayment");
      }
    } else if (payment.cashReceived !== null) {
      return new ShiftPersistenceError("invalidOrderPayment");
    }

    appliedTotal += payment.amount;
  }

  return appliedTotal === total ? null : new ShiftPersistenceError("invalidOrderPayment");
}

async function queryOrderDetail(orderId: string): Promise<OrderDetail> {
  const orderRows = await db
    .select({
      id: orders.id,
      ticketNumber: orders.ticketNumber,
      createdAt: orders.createdAt,
      total: orders.total,
      voidedAt: orders.voidedAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const orderRow = orderRows[0];
  if (!orderRow) {
    throw new ShiftPersistenceError("orderNotFound", { orderId });
  }

  const paymentRows = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(asc(payments.createdAt));

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
    payments: paymentRows.map(rowToOrderPayment),
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

        const orderRows = await db
          .select({ orderId: orders.id, voidedAt: orders.voidedAt })
          .from(orders)
          .where(eq(orders.shiftId, shiftId))
          .orderBy(asc(orders.createdAt));
        const orderIds = orderRows.map((row) => row.orderId);
        const paymentRows =
          orderIds.length === 0
            ? []
            : await db.select().from(payments).where(inArray(payments.orderId, orderIds));
        const paymentsByOrder = groupPaymentsByOrder(paymentRows);

        let cashSales = 0;
        for (const row of orderRows) {
          if (row.voidedAt !== null) continue;
          for (const payment of paymentsByOrder.get(row.orderId) ?? []) {
            if (payment.method.trim().toLowerCase() === "cash") {
              cashSales += payment.amount;
            }
          }
        }

        const movementRows = await db.select().from(cashMovements).where(eq(cashMovements.shiftId, shiftId));
        const totalIncome = movementRows
          .filter((m) => m.type === "income")
          .reduce((sum, m) => sum + m.amount, 0);
        const totalExpense = movementRows
          .filter((m) => m.type === "expense")
          .reduce((sum, m) => sum + m.amount, 0);

        const openingCash = shift.openingCash ?? 0;
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
        const shiftRows = await db.select().from(shifts).orderBy(desc(shifts.openedAt));
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

        const orderRows = await db
          .select({
            orderId: orders.id,
            ticketNumber: orders.ticketNumber,
            orderTotal: orders.total,
            createdAt: orders.createdAt,
            voidedAt: orders.voidedAt,
          })
          .from(orders)
          .where(eq(orders.shiftId, shiftId))
          .orderBy(asc(orders.createdAt));

        const orderIds = orderRows.map((row) => row.orderId);
        const paymentRows =
          orderIds.length === 0
            ? []
            : await db.select().from(payments).where(inArray(payments.orderId, orderIds));
        const paymentsByOrder = groupPaymentsByOrder(paymentRows);

        const itemRows =
          orderIds.length === 0
            ? []
            : await db
                .select({
                  orderId: orderItems.orderId,
                  productId: orderItems.productId,
                  productName: products.name,
                  categoryId: products.categoryId,
                  categoryName: categories.name,
                  quantity: orderItems.quantity,
                  unitPrice: orderItems.unitPrice,
                })
                .from(orderItems)
                .leftJoin(products, eq(products.id, orderItems.productId))
                .leftJoin(categories, eq(categories.id, products.categoryId))
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
          const orderPayments = paymentsByOrder.get(orderRow.orderId) ?? [];
          const itemCount = orderItemsList.reduce((sum, item) => sum + item.quantity, 0);

          if (!isVoided) {
            totalOrders += 1;
            totalSales += orderRow.orderTotal;
            totalItems += itemCount;

            for (const payment of orderPayments) {
              const method = payment.method.trim().toLowerCase();
              if (method === "cash") cashTotal += payment.amount;
              if (method === "card") cardTotal += payment.amount;
            }
          }

          reportOrders.push({
            orderId: orderRow.orderId,
            ticketNumber: orderRow.ticketNumber,
            createdAt: orderRow.createdAt,
            total: orderRow.orderTotal,
            payments: orderPayments.map(rowToReportPayment),
            itemCount,
            items: orderItemsList.map((item) => ({
              productId: item.productId,
              productName: item.productName ?? "",
              categoryId: item.categoryId ?? null,
              categoryName: item.categoryName ?? null,
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
          salesByCategory: aggregateCategorySales(reportOrders),
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
        await db.update(orders).set({ voidedAt: now }).where(eq(orders.id, orderId));
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
        const paymentError = validateUpdatePayments(input.payments, newTotal);
        if (paymentError) {
          throw paymentError;
        }

        const normalizedPayments = input.payments.map((payment) => ({
          id: crypto.randomUUID(),
          orderId,
          method: payment.method.trim().toLowerCase(),
          amount: payment.amount,
          cashReceived: payment.cashReceived,
          createdAt: new Date(),
        }));

        await withTransaction(async (tx) => {
          const oldItems = await tx
            .select({ id: orderItems.id })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

          const oldItemIds = oldItems.map((r) => r.id);
          if (oldItemIds.length > 0) {
            await tx
              .delete(orderItemModifiers)
              .where(inArray(orderItemModifiers.orderItemId, oldItemIds));
            await tx.delete(orderItems).where(inArray(orderItems.id, oldItemIds));
          }

          const now = new Date();
          for (const itemInput of input.items) {
            const itemId = crypto.randomUUID();
            // eslint-disable-next-line no-await-in-loop -- sqlite proxy transaction is sequential
            await tx.insert(orderItems).values({
              id: itemId,
              orderId,
              productId: itemInput.productId,
              quantity: itemInput.quantity,
              unitPrice: itemInput.unitPrice,
              createdAt: now,
            });

            for (const mod of itemInput.modifiers) {
              // eslint-disable-next-line no-await-in-loop -- sqlite proxy transaction is sequential
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

          await tx.delete(payments).where(eq(payments.orderId, orderId));
          await tx.insert(payments).values(normalizedPayments);
          await tx.update(orders).set({ total: newTotal }).where(eq(orders.id, orderId));
        });

        return queryOrderDetail(orderId);
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
