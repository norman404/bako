export interface DeliveryPerson {
  id: string;
  name: string;
  color: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DeliveryPersonCutRow {
  deliveryPersonId: string;
  name: string;
  color: string;
  ordersCount: number;
  totalSales: number;
}

export interface DeliveryPersonCut {
  rows: DeliveryPersonCutRow[];
  totalOrders: number;
  totalSales: number;
  generatedAt: Date;
}
