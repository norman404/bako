export interface TodayMetricsPaymentBreakdown {
  cash: number;
  card: number;
  other: number;
}

export interface ActiveShiftSummary {
  openedAt: Date;
  totalOrders: number;
  totalSales: number;
}

export interface TodayMetrics {
  sales: number;
  totalOrders: number;
  averageTicket: number;
  paymentBreakdown: TodayMetricsPaymentBreakdown;
  activeShift: ActiveShiftSummary | null;
}
