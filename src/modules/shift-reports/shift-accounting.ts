import type { ShiftReportOrder } from "./shift";
import { ORDER_CHANNEL } from "@/modules/order";

export interface AccountingOrder {
  id: string;
  channel: string;
  shiftId: string | null;
  financialShiftId: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  voidedAt: Date | null;
  total: number;
}

export interface AccountingShift {
  id: string;
  closedAt: Date | null;
  deliveryPendingIds?: string[] | null;
}

export function projectShiftOrder(order: AccountingOrder, shift: AccountingShift, now: Date) {
  const cutoff = shift.closedAt ?? now;
  if (order.createdAt > cutoff) return null;

  const frozenPending = shift.closedAt !== null && (shift.deliveryPendingIds ?? []).includes(order.id);
  const isVoided = !frozenPending && order.voidedAt !== null && (order.channel === ORDER_CHANNEL.LOCAL || order.voidedAt <= cutoff);
  const confirmed = !frozenPending && order.confirmedAt !== null;
  const isPending = order.channel !== ORDER_CHANNEL.LOCAL && (shift.closedAt ? frozenPending : !confirmed && !isVoided);
  const belongsToSales = confirmed && order.financialShiftId === shift.id;
  const cancelledHere = !confirmed && isVoided && order.shiftId === shift.id;
  if (!isPending && !belongsToSales && !cancelledHere) return null;

  return {
    isPending,
    isVoided,
    countsAsSale: belongsToSales && !isVoided,
    total: confirmed ? order.total : 0,
    includePayments: belongsToSales,
    canModify: !isVoided && (order.channel === ORDER_CHANNEL.LOCAL || shift.closedAt === null),
  };
}

export function summarizeShiftOrders(orders: ShiftReportOrder[]) {
  const totals = { totalOrders: 0, totalItems: 0, totalSales: 0, cashTotal: 0, cardTotal: 0, platformTotal: 0, localTotal: 0, uberTotal: 0, didiTotal: 0, pendingDeliveries: 0 };
  for (const order of orders) {
    if (order.isPending) totals.pendingDeliveries += 1;
    if (order.isPending || order.isVoided) continue;
    totals.totalOrders += 1;
    totals.totalItems += order.itemCount;
    totals.totalSales += order.total;
    if (order.channel === ORDER_CHANNEL.LOCAL) totals.localTotal += order.total;
    if (order.channel === ORDER_CHANNEL.UBER) totals.uberTotal += order.total;
    if (order.channel === ORDER_CHANNEL.DIDI) totals.didiTotal += order.total;
    for (const payment of order.payments) {
      const method = payment.method.trim().toLowerCase();
      if (method === "cash") totals.cashTotal += payment.amount;
      if (method === "card") totals.cardTotal += payment.amount;
      if (method === "platform") totals.platformTotal += payment.amount;
    }
  }
  return totals;
}
