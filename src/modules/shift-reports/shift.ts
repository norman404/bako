export type ShiftStatus = "active" | "closed";

export type CashMovementType = "income" | "expense";

export interface CashMovement {
  id: string;
  shiftId: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  createdAt: Date;
}

export interface CashMovementInput {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export interface UpdateCashMovementInput {
  amount?: number;
  reason?: string;
}

export interface Shift {
  id: string;
  openedAt: Date;
  closedAt: Date | null;
  status: ShiftStatus;
  openingCash: number;
  countedCash: number | null;
  cashDifference: number | null;
}

export interface ShiftReportOrderItem {
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string | null;
  quantity: number;
  unitPrice: number;
}

export interface ShiftReportCategory {
  categoryId: string | null;
  categoryName: string | null;
  totalItems: number;
  totalSales: number;
}

export interface ShiftReportPayment {
  method: string;
  amount: number;
  cashReceived: number | null;
}

export interface ShiftReportOrder {
  orderId: string;
  ticketNumber: number;
  createdAt: Date;
  total: number;
  payments: ShiftReportPayment[];
  itemCount: number;
  items: ShiftReportOrderItem[];
  isVoided: boolean;
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
  salesByCategory: ShiftReportCategory[];
  openingCash: number;
  cashMovementsIn: number;
  cashMovementsOut: number;
  expectedCash: number;
  countedCash: number | null;
  cashDifference: number | null;
  cashMovements: CashMovement[];
}

export interface ShiftHistoryItem {
  shiftId: string;
  openedAt: Date;
  closedAt: Date | null;
  totalOrders: number;
  totalSales: number;
  openingCash: number;
  cashDifference: number | null;
}
