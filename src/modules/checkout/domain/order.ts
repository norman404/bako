export const CHECKOUT_FULFILLMENT_TYPE = {
  LOCAL: "local",
  DELIVERY: "delivery",
} as const;

export type CheckoutFulfillmentType =
  (typeof CHECKOUT_FULFILLMENT_TYPE)[keyof typeof CHECKOUT_FULFILLMENT_TYPE];

export const CHECKOUT_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
} as const;

export type CheckoutPaymentMethod =
  (typeof CHECKOUT_PAYMENT_METHOD)[keyof typeof CHECKOUT_PAYMENT_METHOD];

export interface CheckoutCustomerInput {
  name: string;
  phone: string;
  address: string;
}

export interface CheckoutOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutPaymentInput {
  method: CheckoutPaymentMethod;
  amount: number;
}

export interface CreateOrderInput {
  items: CheckoutOrderItemInput[];
  fulfillmentType?: CheckoutFulfillmentType;
  customerId?: string | null;
  customer?: CheckoutCustomerInput | null;
  payment: CheckoutPaymentInput;
}

export interface CheckoutCustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckoutOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
}

export interface CheckoutPayment {
  id: string;
  orderId: string;
  method: CheckoutPaymentMethod;
  amount: number;
  createdAt: Date;
}

export interface CheckoutOrder {
  id: string;
  ticketNumber: number;
  customerId: string | null;
  total: number;
  createdAt: Date;
  customer: CheckoutCustomer | null;
  items: CheckoutOrderItem[];
  payment: CheckoutPayment;
}

export function calculateOrderTotal(items: Array<{ unitPrice: number; quantity: number }>): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}
