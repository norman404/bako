import { ORDER_CHANNEL } from "@/modules/order";

export interface MetricsDateRange { start: Date; end: Date }
export interface SalesOrderRow { channel: string; id: string; total: number; createdAt: Date }
export interface SalesItemRow { orderId: string; productId: string; productName: string; quantity: number; unitPrice: number }
export interface MetricsPaymentRow { method: string; amount: number }
export interface SalesSeriesPoint { date: string; sales: number }
export interface ProductMetric { productId: string; productName: string; sales: number; items: number }
export interface PaymentMetric { method: string; amount: number; percentage: number }
export interface SalesMetrics {
  sales: number;
  series: SalesSeriesPoint[];
  products: ProductMetric[];
  payments: PaymentMetric[];
  hourlySales: number[];
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function aggregateSalesMetrics(
  range: MetricsDateRange,
  orders: SalesOrderRow[],
  items: SalesItemRow[],
  payments: MetricsPaymentRow[] = [],
): SalesMetrics {
  const sales = orders.reduce((sum, order) => sum + order.total, 0);
  const localOrderIds = new Set(orders.filter((order) => order.channel === ORDER_CHANNEL.LOCAL).map((order) => order.id));
  const products = new Map<string, ProductMetric>();
  for (const item of items) {
    if (!localOrderIds.has(item.orderId)) continue;
    const product = products.get(item.productId) ?? { productId: item.productId, productName: item.productName, sales: 0, items: 0 };
    product.sales += item.unitPrice * item.quantity;
    product.items += item.quantity;
    products.set(item.productId, product);
  }

  const points = new Map<string, SalesSeriesPoint>();
  const cursor = new Date(range.start); cursor.setHours(0, 0, 0, 0);
  while (cursor < range.end) { const date = dateKey(cursor); points.set(date, { date, sales: 0 }); cursor.setDate(cursor.getDate() + 1); }
  const hourlySales = Array.from({ length: 24 }, () => 0);
  for (const order of orders) {
    const point = points.get(dateKey(order.createdAt));
    if (point) point.sales += order.total;
    hourlySales[order.createdAt.getHours()]! += order.total;
  }

  const paymentMap = new Map<string, number>();
  for (const payment of payments) {
    if (payment.amount <= 0) continue;
    paymentMap.set(payment.method, (paymentMap.get(payment.method) ?? 0) + payment.amount);
  }
  const paymentTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    sales,
    series: [...points.values()],
    products: [...products.values()].sort((a, b) => b.sales - a.sales),
    payments: [...paymentMap].map(([method, amount]) => ({ method, amount, percentage: paymentTotal ? amount / paymentTotal : 0 })).sort((a, b) => b.amount - a.amount),
    hourlySales,
  };
}
