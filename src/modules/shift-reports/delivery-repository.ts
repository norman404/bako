import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db/client";
import { featureFlags, orderItems, orders, payments, shifts } from "@/db/schema";
import { isOrderChannel, ORDER_CHANNEL } from "@/modules/order";
import { ShiftPersistenceError } from "./errors";
import { buildDeliveryConfirmation, type ConfirmDeliveryInput, type PendingDelivery } from "./delivery";

export async function listPendingDeliveries(): Promise<PendingDelivery[]> {
  const rows = await db.select({
    id: orders.id,
    ticketNumber: orders.ticketNumber,
    orderName: orders.orderName,
    channel: orders.channel,
    deliveryReference: orders.deliveryReference,
    createdAt: orders.createdAt,
    itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
    catalogTotal: sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
  }).from(orders).leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(ne(orders.channel, ORDER_CHANNEL.LOCAL), isNull(orders.confirmedAt), isNull(orders.voidedAt)))
    .groupBy(orders.id).orderBy(asc(orders.createdAt));

  return rows.map((row) => {
    if (!isOrderChannel(row.channel)) throw new ShiftPersistenceError("deliveryRequired");
    return {
      id: row.id,
      ticketNumber: row.ticketNumber,
      orderName: row.orderName,
      channel: row.channel,
      deliveryReference: row.deliveryReference,
      createdAt: row.createdAt,
      itemCount: row.itemCount,
      catalogTotal: row.catalogTotal,
    };
  });
}

export async function confirmDelivery(orderId: string, input: ConfirmDeliveryInput): Promise<void> {
  try {
    await withTransaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!order) throw new ShiftPersistenceError("orderNotFound");
      const [catalog] = await tx.select({
        catalogTotal: sql<number>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
      }).from(orderItems).where(eq(orderItems.orderId, orderId));
      const confirmation = buildDeliveryConfirmation(
        { ...order, catalogTotal: catalog?.catalogTotal ?? 0 },
        input,
        new Date(),
      );

      const [shiftFlag] = await tx.select().from(featureFlags).where(eq(featureFlags.key, "shift_management_enabled"));
      if (input.shiftId) {
        const [shift] = await tx.select().from(shifts).where(eq(shifts.id, input.shiftId));
        if (!shift || shift.status !== "active") throw new ShiftPersistenceError("noActiveShift");
      } else if (shiftFlag?.value === "true") {
        throw new ShiftPersistenceError("noActiveShift");
      }

      await tx.insert(payments).values({
        id: crypto.randomUUID(),
        orderId,
        ...confirmation.payment,
      });
      await tx.update(orders).set(confirmation.order)
        .where(eq(orders.id, orderId));
    });
  } catch (cause) {
    if (cause instanceof ShiftPersistenceError) throw cause;
    throw new ShiftPersistenceError(
      "dbError",
      { context: "Failed to confirm delivery", cause: String(cause) },
      `Failed to confirm delivery: ${String(cause)}`,
    );
  }
}
