export type ShiftStatus = "active" | "closed";

export interface Shift {
  id: string;
  openedAt: Date;
  closedAt: Date | null;
  status: ShiftStatus;
}

export interface ShiftReportOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ShiftReportOrder {
  orderId: string;
  ticketNumber: number;
  createdAt: Date;
  total: number;
  paymentMethod: string;
  itemCount: number;
  items: ShiftReportOrderItem[];
}

export interface ShiftReport {
  shiftId: string;
  openedAt: Date;
  closedAt: Date | null;
  totalOrders: number;
  totalItems: number;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  orders: ShiftReportOrder[];
}

export interface ShiftHistoryItem {
  shiftId: string;
  openedAt: Date;
  closedAt: Date | null;
  totalOrders: number;
  totalSales: number;
}
