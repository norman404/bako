import type { ShiftReportCategory, ShiftReportOrder } from "../shift";

interface MutableCategoryProduct {
  productId: string;
  productName: string;
  quantity: number;
  totalSales: number;
}

interface MutableCategory {
  categoryId: string | null;
  categoryName: string | null;
  totalItems: number;
  totalSales: number;
  products: Map<string, MutableCategoryProduct>;
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
        products: new Map<string, MutableCategoryProduct>(),
      };
      const lineTotal = item.unitPrice * item.quantity;
      const product = category.products.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        totalSales: 0,
      };

      category.totalItems += item.quantity;
      category.totalSales += lineTotal;
      product.quantity += item.quantity;
      product.totalSales += lineTotal;
      category.products.set(item.productId, product);
      categories.set(categoryId, category);
    }
  }

  return [...categories.values()].map((category) => ({
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    totalItems: category.totalItems,
    totalSales: category.totalSales,
    products: [...category.products.values()],
  }));
}
