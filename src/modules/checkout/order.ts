import type { OrderChannel } from "@/modules/order";
import type { AppliedPromotionKind } from "@/modules/promotions";

export const CHECKOUT_PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  PLATFORM: "platform",
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

export interface CheckoutOrderItemChildInput {
  productId: string;
  quantity: number;
}

export interface CheckoutOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount?: number;
  promotionRef?: string | null;
  children?: CheckoutOrderItemChildInput[];
  modifiers: CheckoutOrderItemModifierInput[];
}

export interface CheckoutOrderPromotionInput {
  ref: string;
  promotionId: string | null;
  kind: AppliedPromotionKind;
  name: string;
  ruleSnapshot: Record<string, unknown>;
  discountAmount: number;
}

export interface CheckoutPaymentInput {
  method: CheckoutPaymentMethod;
  amount: number;
  cashReceived?: number | null;
}

export interface CreateOrderInput {
  orderName?: string | null;
  channel?: OrderChannel;
  deliveryReference?: string | null;
  items: CheckoutOrderItemInput[];
  promotions?: CheckoutOrderPromotionInput[];
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
  unitCost: number;
  discountAmount: number;
  orderPromotionId: string | null;
  parentOrderItemId: string | null;
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
  channel: OrderChannel;
  deliveryReference: string | null;
  confirmedAt: Date | null;
  orderName: string | null;
  ticketNumber: number;
  shiftId: string | null;
  total: number;
  createdAt: Date;
  items: CheckoutOrderItem[];
  payments: CheckoutPayment[];
}

export interface OrderTotalLine {
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
}

export function calculateOrderTotal(items: OrderTotalLine[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity - (item.discountAmount ?? 0), 0);
}

export type { CheckoutPaymentMethod };
