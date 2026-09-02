export interface MetricsDateRange { start: Date; end: Date }
export interface SalesOrderRow { id: string; total: number; createdAt: Date; shiftId?: string | null }
export interface SalesItemRow { orderId: string; productId: string; productName: string; quantity: number; unitPrice: number; unitCost: number; categoryId: string | null; categoryName: string | null }
export interface MetricsPaymentRow { method: string; amount: number }
export interface MetricsShiftRow { id: string; openedAt: Date; closedAt: Date | null; cashDifference: number | null }
export interface SalesSeriesPoint { date: string; sales: number; items: number; orders: number }
export interface CategoryMetric { categoryId: string | null; categoryName: string | null; sales: number; items: number; profit: number }
export interface ProductMetric { productId: string; productName: string; sales: number; items: number; profit: number }
export interface PaymentMetric { method: string; amount: number; percentage: number }
export interface SalesSummary { sales: number; totalOrders: number; totalItems: number; averageTicket: number; cost: number; profit: number; margin: number }
export interface SalesMetrics extends SalesSummary {
  previous: SalesSummary;
  series: SalesSeriesPoint[];
  categories: CategoryMetric[];
  products: ProductMetric[];
  payments: PaymentMetric[];
  hourlySales: number[];
  weekdaySales: number[];
  shifts: { count: number; averageSales: number; averageDurationMinutes: number; cashDifference: number };
  voids: { count: number; amount: number; rate: number };
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function summary(orders: SalesOrderRow[], items: SalesItemRow[]): SalesSummary {
  const sales = orders.reduce((sum, order) => sum + order.total, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const cost = items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  const profit = sales - cost;
  return { sales, totalOrders: orders.length, totalItems, averageTicket: orders.length ? Math.round(sales / orders.length) : 0, cost, profit, margin: sales ? profit / sales : 0 };
}

export function aggregateSalesMetrics(
  range: MetricsDateRange,
  orders: SalesOrderRow[],
  items: SalesItemRow[],
  previousOrders: SalesOrderRow[] = [],
  previousItems: SalesItemRow[] = [],
  payments: MetricsPaymentRow[] = [],
  voidedOrders: SalesOrderRow[] = [],
  shifts: MetricsShiftRow[] = [],
): SalesMetrics {
  const countsByOrder = new Map<string, number>();
  const categories = new Map<string | null, CategoryMetric>();
  const products = new Map<string, ProductMetric>();
  for (const item of items) {
    const sales = item.unitPrice * item.quantity;
    const profit = (item.unitPrice - item.unitCost) * item.quantity;
    countsByOrder.set(item.orderId, (countsByOrder.get(item.orderId) ?? 0) + item.quantity);
    const categoryId = item.categoryName === null ? null : item.categoryId;
    const category = categories.get(categoryId) ?? { categoryId, categoryName: categoryId === null ? null : item.categoryName, sales: 0, items: 0, profit: 0 };
    category.sales += sales; category.items += item.quantity; category.profit += profit; categories.set(categoryId, category);
    const product = products.get(item.productId) ?? { productId: item.productId, productName: item.productName, sales: 0, items: 0, profit: 0 };
    product.sales += sales; product.items += item.quantity; product.profit += profit; products.set(item.productId, product);
  }

  const points = new Map<string, SalesSeriesPoint>();
  const cursor = new Date(range.start); cursor.setHours(0, 0, 0, 0);
  while (cursor < range.end) { const date = dateKey(cursor); points.set(date, { date, sales: 0, items: 0, orders: 0 }); cursor.setDate(cursor.getDate() + 1); }
  const hourlySales = Array.from({ length: 24 }, () => 0);
  const weekdaySales = Array.from({ length: 7 }, () => 0);
  for (const order of orders) {
    const point = points.get(dateKey(order.createdAt));
    if (point) { point.sales += order.total; point.items += countsByOrder.get(order.id) ?? 0; point.orders += 1; }
    hourlySales[order.createdAt.getHours()]! += order.total;
    weekdaySales[order.createdAt.getDay()]! += order.total;
  }

  const paymentMap = new Map<string, number>();
  for (const payment of payments) paymentMap.set(payment.method, (paymentMap.get(payment.method) ?? 0) + payment.amount);
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const salesByShift = new Map<string, number>();
  for (const order of orders) if (order.shiftId) salesByShift.set(order.shiftId, (salesByShift.get(order.shiftId) ?? 0) + order.total);
  const closedShifts = shifts.filter((shift) => shift.closedAt);
  const duration = closedShifts.reduce((sum, shift) => sum + ((shift.closedAt?.getTime() ?? shift.openedAt.getTime()) - shift.openedAt.getTime()) / 60_000, 0);
  const current = summary(orders, items);
  const voidAmount = voidedOrders.reduce((sum, order) => sum + order.total, 0);

  return {
    ...current,
    previous: summary(previousOrders, previousItems),
    series: [...points.values()],
    categories: [...categories.values()].sort((a, b) => b.sales - a.sales),
    products: [...products.values()].sort((a, b) => b.sales - a.sales),
    payments: [...paymentMap].map(([method, amount]) => ({ method, amount, percentage: paymentTotal ? amount / paymentTotal : 0 })).sort((a, b) => b.amount - a.amount),
    hourlySales,
    weekdaySales,
    shifts: { count: shifts.length, averageSales: shifts.length ? Math.round([...salesByShift.values()].reduce((a, b) => a + b, 0) / shifts.length) : 0, averageDurationMinutes: closedShifts.length ? Math.round(duration / closedShifts.length) : 0, cashDifference: shifts.reduce((sum, shift) => sum + (shift.cashDifference ?? 0), 0) },
    voids: { count: voidedOrders.length, amount: voidAmount, rate: orders.length + voidedOrders.length ? voidedOrders.length / (orders.length + voidedOrders.length) : 0 },
  };
}
