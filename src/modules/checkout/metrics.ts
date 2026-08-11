export interface PosMetricsPaymentBreakdown {
  cashSales: number;
  cardSales: number;
}

export interface PosMetricsTopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  sales: number;
}

export interface PosMetrics {
  sales: number;
  tickets: number;
  averageTicket: number;
  itemsSold: number;
  paymentBreakdown: PosMetricsPaymentBreakdown;
  topProducts: PosMetricsTopProduct[];
  updatedAt: Date;
}
