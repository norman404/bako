export type ShiftStatus = "active" | "closed";

export interface Shift {
  id: string;
  openedAt: Date;
  closedAt: Date | null;
  status: ShiftStatus;
}

export interface ShiftReport {
  shiftId: string;
  openedAt: Date;
  closedAt: Date | null;
  totalOrders: number;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
}

export interface ShiftHistoryItem {
  shiftId: string;
  openedAt: Date;
  closedAt: Date | null;
  totalOrders: number;
  totalSales: number;
}
