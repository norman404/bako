import type { CreateOrderInput } from "../order";
import {
  buildPaymentInputs,
  type CheckoutPaymentMode,
} from "./payment";
import type { CartItem, CartPricing } from "@/modules/order";

export { CHECKOUT_PAYMENT_METHOD, type CheckoutPaymentMethod } from "../order";
export {
  CHECKOUT_PAYMENT_MODE,
  getPaymentValidationMessage,
  type CheckoutPaymentMode,
} from "./payment";
export { buildPaymentInputs } from "./payment";

// Built from the priced segments, not the cart lines: a line split by a promotion becomes
// several order items, each carrying its own discount and the promotion that justifies it.
export function buildOrderItemsInput(items: CartItem[], pricing: CartPricing): CreateOrderInput["items"] {
  const itemsByLineId = new Map(items.map((item) => [item.lineId, item]));

  return pricing.segments.flatMap((segment) => {
    const item = itemsByLineId.get(segment.lineId);
    if (!item) return [];

    const components = item.composite?.components ?? [];
    return [
      {
        productId: item.product.id,
        quantity: segment.quantity,
        unitPrice: segment.unitPrice,
        // A composite costs what its components cost, whatever the parent product says.
        unitCost: item.composite
          ? components.reduce((sum, component) => sum + component.product.costPrice * component.quantity, 0)
          : item.product.costPrice,
        discountAmount: segment.discountAmount,
        promotionRef: segment.applicationRef,
        children: components.map((component) => ({
          productId: component.product.id,
          quantity: component.quantity * segment.quantity,
        })),
        modifiers: item.selectedModifiers.map((m) => ({
          groupId: m.groupId,
          groupName: m.groupName,
          optionId: m.optionId,
          optionName: m.optionName,
          priceDelta: m.priceDelta,
          textValue: m.textValue,
        })),
      },
    ];
  });
}

export function buildOrderPromotionsInput(pricing: CartPricing): NonNullable<CreateOrderInput["promotions"]> {
  return pricing.applications.map((application) => ({
    ref: application.ref,
    promotionId: application.promotionId,
    kind: application.kind,
    name: application.name,
    ruleSnapshot: application.ruleSnapshot,
    discountAmount: application.discountAmount,
  }));
}

export function buildPaymentInput(
  mode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
): CreateOrderInput["payments"] | null {
  return buildPaymentInputs(mode, cashAmountInput, total);
}

export function buildCreateOrderInput(
  items: CartItem[],
  pricing: CartPricing,
  paymentMode: CheckoutPaymentMode,
  cashAmountInput: string,
  orderName: string,
): CreateOrderInput | null {
  if (items.length === 0) {
    return null;
  }

  const payments = buildPaymentInput(paymentMode, cashAmountInput, pricing.total);
  if (!payments) {
    return null;
  }

  return {
    orderName,
    items: buildOrderItemsInput(items, pricing),
    promotions: buildOrderPromotionsInput(pricing),
    payments,
  };
}
