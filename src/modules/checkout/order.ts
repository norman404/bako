export const CHECKOUT_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
} as const;

type CheckoutPaymentMethod =
  (typeof CHECKOUT_PAYMENT_METHOD)[keyof typeof CHECKOUT_PAYMENT_METHOD];

export interface CheckoutOrderItemModifierInput {
  groupId: string;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  priceDelta: number;
  textValue: string | null;
}

export interface CheckoutOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  modifiers: CheckoutOrderItemModifierInput[];
}

export interface CheckoutPaymentInput {
  method: CheckoutPaymentMethod;
  amount: number;
  cashReceived?: number | null;
}

export interface CreateOrderInput {
  orderName?: string | null;
  items: CheckoutOrderItemInput[];
  payments: CheckoutPaymentInput[];
  shiftId?: string | null;
}

export interface CheckoutOrderItemModifier {
  id: string;
  orderItemId: string;
  groupId: string | null;
  groupName: string;
  optionId: string | null;
  optionName: string;
  priceDelta: number;
  textValue: string | null;
  createdAt: Date;
}

export interface CheckoutOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  modifiers: CheckoutOrderItemModifier[];
  createdAt: Date;
}

export interface CheckoutPayment {
  id: string;
  orderId: string;
  method: CheckoutPaymentMethod;
  amount: number;
  cashReceived: number | null;
  createdAt: Date;
}

export interface CheckoutOrder {
  id: string;
  orderName: string | null;
  ticketNumber: number;
  shiftId: string | null;
  total: number;
  createdAt: Date;
  items: CheckoutOrderItem[];
  payments: CheckoutPayment[];
}

export function calculateOrderTotal(items: Array<{ unitPrice: number; quantity: number }>): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export type { CheckoutPaymentMethod };
