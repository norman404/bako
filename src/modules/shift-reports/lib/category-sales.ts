import type { ShiftReportCategory, ShiftReportOrder } from "../shift";

interface MutableCategory {
  categoryId: string | null;
  categoryName: string | null;
  totalItems: number;
  totalSales: number;
}

export function aggregateCategorySales(
  orders: Array<Pick<ShiftReportOrder, "isVoided" | "items">>,
): ShiftReportCategory[] {
  const categories = new Map<string | null, MutableCategory>();

  for (const order of orders) {
    if (order.isVoided) continue;

    for (const item of order.items) {
      const categoryId = item.categoryName === null ? null : item.categoryId;
      const categoryName = categoryId === null ? null : item.categoryName;
      const category = categories.get(categoryId) ?? {
        categoryId,
        categoryName,
        totalItems: 0,
        totalSales: 0,
      };
      const lineTotal = item.unitPrice * item.quantity;

      category.totalItems += item.quantity;
      category.totalSales += lineTotal;
      categories.set(categoryId, category);
    }
  }

  return [...categories.values()];
}
