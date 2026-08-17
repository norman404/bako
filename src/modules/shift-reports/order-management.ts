export interface OrderDetailItemModifier {
  groupId: string | null;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  textValue: string | null;
  priceDelta: number;
}

export interface OrderDetailItem {
  id: string;
  productId: string;
  productName: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
  modifiers: OrderDetailItemModifier[];
}

export interface OrderDetailPayment {
  id: string;
  method: string;
  amount: number;
  cashReceived: number | null;
  createdAt: Date;
}

export interface CommandItemSelection {
  orderItemId: string;
  quantity: number;
}

export interface OrderDetail {
  id: string;
  ticketNumber: number;
  createdAt: Date;
  total: number;
  payments: OrderDetailPayment[];
  items: OrderDetailItem[];
  isVoided: boolean;
  voidedAt: Date | null;
}

export interface UpdateOrderItemModifierInput {
  groupId: string;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  priceDelta: number;
  textValue: string | null;
}

export interface UpdateOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  modifiers: UpdateOrderItemModifierInput[];
}

export interface UpdateOrderPaymentInput {
  method: string;
  amount: number;
  cashReceived: number | null;
}

export interface UpdateOrderInput {
  items: UpdateOrderItemInput[];
  payments: UpdateOrderPaymentInput[];
}
