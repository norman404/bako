import type { ShiftReportCategory, ShiftReportOrder } from "../shift";

interface MutableCategory {
  categoryId: string | null;
  categoryName: string | null;
  totalItems: number;
  totalSales: number;
}

export function aggregateCategorySales(
  orders: Array<Pick<ShiftReportOrder, "isVoided" | "items" | "isPending" | "total">>,
): ShiftReportCategory[] {
  const categories = new Map<string | null, MutableCategory>();

  for (const order of orders) {
    if (order.isVoided || order.isPending) continue;

    // Promotion discounts are exact per line; the ratio only absorbs what they cannot, such as
    // a delivery collected for a different amount than its catalog prices.
    const netLine = (item: (typeof order.items)[number]) => item.unitPrice * item.quantity - (item.discountAmount ?? 0);
    const catalogTotal = order.items.reduce((sum, item) => sum + netLine(item), 0);
    const revenueRatio = catalogTotal > 0 ? order.total / catalogTotal : 0;

    for (const item of order.items) {
      const categoryId = item.categoryName === null ? null : item.categoryId;
      const categoryName = categoryId === null ? null : item.categoryName;
      const category = categories.get(categoryId) ?? {
        categoryId,
        categoryName,
        totalItems: 0,
        totalSales: 0,
      };
      const lineTotal = Math.round(netLine(item) * revenueRatio);

      category.totalItems += item.quantity;
      category.totalSales += lineTotal;
      categories.set(categoryId, category);
    }
  }

  return [...categories.values()];
}
