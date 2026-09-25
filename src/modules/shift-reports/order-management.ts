import type { OrderChannel } from "@/modules/order";

export interface OrderDetailItemModifier {
  groupId: string | null;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  textValue: string | null;
  priceDelta: number;
}

export interface OrderDetailItemChild {
  productId: string;
  productName: string;
  categoryId: string | null;
  quantity: number;
}

export interface OrderDetailItem {
  id: string;
  productId: string;
  productName: string;
  categoryId: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  orderPromotionId: string | null;
  promotionName: string | null;
  modifiers: OrderDetailItemModifier[];
  // Products included in a composite line; empty for regular lines.
  children: OrderDetailItemChild[];
}

export interface OrderDetailPromotion {
  id: string;
  promotionId: string | null;
  kind: string;
  name: string;
  ruleSnapshot: unknown;
  discountAmount: number;
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
  channel: OrderChannel;
  deliveryReference: string | null;
  confirmedAt: Date | null;
  orderName: string | null;
  ticketNumber: number;
  createdAt: Date;
  total: number;
  payments: OrderDetailPayment[];
  items: OrderDetailItem[];
  promotions: OrderDetailPromotion[];
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

export interface UpdateOrderItemChildInput {
  productId: string;
  quantity: number;
}

export interface UpdateOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  promotionRef: string | null;
  modifiers: UpdateOrderItemModifierInput[];
  children: UpdateOrderItemChildInput[];
}

export interface UpdateOrderPromotionInput {
  ref: string;
  promotionId: string | null;
  kind: string;
  name: string;
  ruleSnapshot: unknown;
  discountAmount: number;
}

export interface UpdateOrderPaymentInput {
  method: string;
  amount: number;
  cashReceived: number | null;
}

export interface UpdateOrderInput {
  items: UpdateOrderItemInput[];
  promotions: UpdateOrderPromotionInput[];
  payments: UpdateOrderPaymentInput[];
}
