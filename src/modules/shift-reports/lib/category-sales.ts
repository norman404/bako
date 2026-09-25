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

    const catalogTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
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
      const lineTotal = Math.round(item.unitPrice * item.quantity * revenueRatio);

      category.totalItems += item.quantity;
      category.totalSales += lineTotal;
      categories.set(categoryId, category);
    }
  }

  return [...categories.values()];
}
