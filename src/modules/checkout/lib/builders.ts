import type { CreateOrderInput } from "../order";
import {
  buildPaymentInputs,
  type CheckoutPaymentMode,
} from "./payment";
import { calculateItemUnitPrice } from "@/modules/menu";
import type { CartItem } from "@/modules/order";

export { CHECKOUT_PAYMENT_METHOD, type CheckoutPaymentMethod } from "../order";
export {
  CHECKOUT_PAYMENT_MODE,
  getPaymentValidationMessage,
  type CheckoutPaymentMode,
} from "./payment";
export { buildPaymentInputs } from "./payment";

export function buildOrderItemsInput(items: CartItem[]): CreateOrderInput["items"] {
  return items.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
    unitPrice: calculateItemUnitPrice(item.product, item.selectedModifiers),
    modifiers: item.selectedModifiers.map((m) => ({
      groupId: m.groupId,
      groupName: m.groupName,
      optionId: m.optionId,
      optionName: m.optionName,
      priceDelta: m.priceDelta,
      textValue: m.textValue,
    })),
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
  paymentMode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
  orderName: string,
): CreateOrderInput | null {
  if (items.length === 0) {
    return null;
  }

  const payments = buildPaymentInput(paymentMode, cashAmountInput, total);
  if (!payments) {
    return null;
  }

  return {
    orderName,
    items: buildOrderItemsInput(items),
    payments,
  };
}
