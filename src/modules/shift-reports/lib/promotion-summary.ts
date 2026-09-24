import type { ShiftReportOrder, ShiftReportPromotion } from "../shift";

export interface AppliedPromotionRow {
  orderId: string;
  promotionId: string | null;
  kind: string;
  name: string;
  discountAmount: number;
}

// Grouped by promotion id when there is one, so renaming a promotion does not split its
// history; composites have no promotion row and are grouped by their frozen name.
export function aggregatePromotions(
  rows: AppliedPromotionRow[],
  orders: Array<Pick<ShiftReportOrder, "orderId" | "isVoided" | "isPending">>,
): ShiftReportPromotion[] {
  const countedOrderIds = new Set(
    orders.filter((order) => !order.isVoided && !order.isPending).map((order) => order.orderId),
  );
  const summaries = new Map<string, ShiftReportPromotion>();

  for (const row of rows) {
    if (!countedOrderIds.has(row.orderId)) continue;

    const key = row.promotionId ?? `${row.kind}:${row.name}`;
    const summary = summaries.get(key) ?? {
      promotionId: row.promotionId,
      kind: row.kind,
      name: row.name,
      timesApplied: 0,
      discountTotal: 0,
    };
    summary.timesApplied += 1;
    summary.discountTotal += row.discountAmount;
    summaries.set(key, summary);
  }

  return [...summaries.values()].sort((a, b) => b.discountTotal - a.discountTotal || a.name.localeCompare(b.name));
}
