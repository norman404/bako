import { isOrderChannel, normalizeDeliveryReference, normalizeOrderName, ORDER_CHANNEL, type OrderChannel } from "@/modules/order";
import { isAppliedPromotionKind } from "@/modules/promotions";
import { CheckoutPersistenceError } from "./errors";
import {
  CHECKOUT_PAYMENT_METHOD,
  calculateOrderTotal,
  type CheckoutOrderItemChildInput,
  type CheckoutOrderItemInput,
  type CheckoutOrderPromotionInput,
  type CheckoutPaymentMethod,
  type CreateOrderInput,
} from "./order";

const CHECKOUT_PAYMENT_METHOD_VALUES = new Set<CheckoutPaymentMethod>(
  Object.values(CHECKOUT_PAYMENT_METHOD),
);

export interface NormalizedCheckoutPaymentInput {
  method: string;
  amount: number;
  cashReceived: number | null;
}

export interface NormalizedCheckoutOrderItemInput extends CheckoutOrderItemInput {
  discountAmount: number;
  promotionRef: string | null;
  children: CheckoutOrderItemChildInput[];
}

export interface NormalizedCreateOrderInput {
  orderName: string | null;
  channel: OrderChannel;
  deliveryReference: string | null;
  items: NormalizedCheckoutOrderItemInput[];
  promotions: CheckoutOrderPromotionInput[];
  shiftId: string | null;
  payments: NormalizedCheckoutPaymentInput[];
}

export function isCheckoutPaymentMethod(value: string): value is CheckoutPaymentMethod {
  return CHECKOUT_PAYMENT_METHOD_VALUES.has(value as CheckoutPaymentMethod);
}

function validatePaymentInput(
  paymentsInput: NormalizedCheckoutPaymentInput[],
  total: number,
): CheckoutPersistenceError | null {
  if (paymentsInput.length === 0) {
    return new CheckoutPersistenceError("paymentRequired");
  }

  const methods = new Set<string>();
  let appliedTotal = 0;

  for (const payment of paymentsInput) {
    if (!isCheckoutPaymentMethod(payment.method) || payment.method === CHECKOUT_PAYMENT_METHOD.PLATFORM) {
      return new CheckoutPersistenceError("invalidPaymentMethod", { method: payment.method });
    }

    if (!Number.isInteger(payment.amount) || payment.amount < 0) {
      return new CheckoutPersistenceError("invalidPaymentAmount", { amount: payment.amount });
    }

    if (paymentsInput.length > 1 && payment.amount === 0) {
      return new CheckoutPersistenceError("invalidPaymentAmount", { amount: payment.amount });
    }

    if (methods.has(payment.method)) {
      return new CheckoutPersistenceError("duplicatePaymentMethod", { method: payment.method });
    }
    methods.add(payment.method);

    if (payment.method === CHECKOUT_PAYMENT_METHOD.CASH) {
      if (
        payment.cashReceived === null ||
        !Number.isInteger(payment.cashReceived) ||
        payment.cashReceived < payment.amount
      ) {
        return new CheckoutPersistenceError("cashReceivedInvalid", {
          amount: payment.amount,
          cashReceived: payment.cashReceived,
        });
      }

      if (paymentsInput.length > 1 && payment.cashReceived !== payment.amount) {
        return new CheckoutPersistenceError("mixedPaymentCashReceivedMismatch");
      }
    } else if (payment.cashReceived !== null) {
      return new CheckoutPersistenceError("cashReceivedInvalid");
    }

    appliedTotal += payment.amount;
  }

  if (appliedTotal !== total) {
    return new CheckoutPersistenceError("paymentTotalMismatch", {
      appliedTotal,
      total,
    });
  }

  return null;
}

export interface PromotionEvidenceLine {
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  promotionRef: string | null;
}

export interface PromotionEvidence {
  ref: string;
  name: string;
  kind: string;
  discountAmount: number;
}

// Every discounted line must point at the promotion that justifies it, and each promotion's
// recorded discount must equal what its lines actually subtract — the evidence cannot drift.
export function validatePromotionEvidence(
  items: PromotionEvidenceLine[],
  promotions: PromotionEvidence[],
): CheckoutPersistenceError | null {
  const allocatedByRef = new Map<string, number>();
  for (const promotion of promotions) {
    if (
      promotion.ref.length === 0 ||
      allocatedByRef.has(promotion.ref) ||
      promotion.name.length === 0 ||
      !isAppliedPromotionKind(promotion.kind) ||
      !Number.isInteger(promotion.discountAmount) ||
      promotion.discountAmount <= 0
    ) {
      return new CheckoutPersistenceError("orderPromotionInvalid", { ref: promotion.ref });
    }
    allocatedByRef.set(promotion.ref, 0);
  }

  for (const item of items) {
    if (
      !Number.isInteger(item.discountAmount) ||
      item.discountAmount < 0 ||
      item.discountAmount > item.unitPrice * item.quantity
    ) {
      return new CheckoutPersistenceError("orderItemDiscountInvalid", { discountAmount: item.discountAmount });
    }

    if (item.promotionRef === null) {
      if (item.discountAmount > 0) {
        return new CheckoutPersistenceError("orderPromotionInvalid", { reason: "unjustifiedDiscount" });
      }
      continue;
    }

    const allocated = allocatedByRef.get(item.promotionRef);
    if (allocated === undefined) {
      return new CheckoutPersistenceError("orderPromotionInvalid", { ref: item.promotionRef });
    }
    allocatedByRef.set(item.promotionRef, allocated + item.discountAmount);
  }

  for (const promotion of promotions) {
    if (allocatedByRef.get(promotion.ref) !== promotion.discountAmount) {
      return new CheckoutPersistenceError("orderPromotionInvalid", { ref: promotion.ref, reason: "allocation" });
    }
  }

  return null;
}

function validatePromotionInput(input: NormalizedCreateOrderInput): CheckoutPersistenceError | null {
  const hasDiscount = input.items.some((item) => item.discountAmount > 0 || item.promotionRef !== null);
  if (input.channel !== ORDER_CHANNEL.LOCAL && (input.promotions.length > 0 || hasDiscount)) {
    return new CheckoutPersistenceError("orderPromotionInvalid", { reason: "channel" });
  }

  return validatePromotionEvidence(input.items, input.promotions);
}

export function validateCreateOrderInput(input: NormalizedCreateOrderInput): CheckoutPersistenceError | null {
  if (!isOrderChannel(input.channel)) {
    return new CheckoutPersistenceError("invalidOrderChannel");
  }

  if (input.items.length === 0) {
    return new CheckoutPersistenceError("orderItemsRequired");
  }

  for (const item of input.items) {
    if (item.productId.trim().length === 0) {
      return new CheckoutPersistenceError("orderItemProductIdRequired");
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return new CheckoutPersistenceError("orderItemQuantityInvalid", { quantity: item.quantity });
    }

    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      return new CheckoutPersistenceError("orderItemUnitPriceInvalid", { unitPrice: item.unitPrice });
    }

    if (!Number.isInteger(item.unitCost) || item.unitCost < 0) {
      return new CheckoutPersistenceError("orderItemUnitPriceInvalid", { unitCost: item.unitCost });
    }

    for (const child of item.children) {
      if (child.productId.trim().length === 0 || !Number.isInteger(child.quantity) || child.quantity <= 0) {
        return new CheckoutPersistenceError("orderItemChildInvalid", { productId: child.productId });
      }
    }
  }

  const promotionError = validatePromotionInput(input);
  if (promotionError) return promotionError;

  if (input.channel !== ORDER_CHANNEL.LOCAL) {
    return input.payments.length === 0 ? null : new CheckoutPersistenceError("pendingPaymentNotAllowed");
  }

  const total = calculateOrderTotal(input.items);
  return validatePaymentInput(input.payments, total);
}

export function normalizeCreateOrderInput(input: CreateOrderInput): NormalizedCreateOrderInput {
  return {
    orderName: normalizeOrderName(input.orderName),
    channel: input.channel ?? ORDER_CHANNEL.LOCAL,
    deliveryReference: input.channel && input.channel !== ORDER_CHANNEL.LOCAL ? normalizeDeliveryReference(input.deliveryReference) : null,
    items: input.items.map((item) => ({
      productId: item.productId.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost,
      discountAmount: item.discountAmount ?? 0,
      promotionRef: item.promotionRef ?? null,
      children: (item.children ?? []).map((child) => ({
        productId: child.productId.trim(),
        quantity: child.quantity,
      })),
      modifiers: (item.modifiers ?? []).map((modifier) => ({
        groupId: modifier.groupId,
        groupName: modifier.groupName,
        optionId: modifier.optionId,
        optionName: modifier.optionName ?? "",
        priceDelta: modifier.priceDelta,
        textValue: modifier.textValue,
      })),
    })),
    promotions: (input.promotions ?? []).map((promotion) => ({
      ref: promotion.ref,
      promotionId: promotion.promotionId,
      kind: promotion.kind,
      name: promotion.name.trim(),
      ruleSnapshot: promotion.ruleSnapshot,
      discountAmount: promotion.discountAmount,
    })),
    shiftId: input.shiftId?.trim() || null,
    payments: (input.payments ?? []).map((payment) => ({
      method: String(payment.method ?? "")
        .trim()
        .toLowerCase(),
      amount: payment.amount,
      cashReceived: payment.cashReceived ?? null,
    })),
  };
}


export function initialOrderAccounting(input: NormalizedCreateOrderInput, now: Date) {
  const isLocal = input.channel === ORDER_CHANNEL.LOCAL;
  return {
    total: isLocal ? calculateOrderTotal(input.items) : 0,
    confirmedAt: isLocal ? now : null,
    financialShiftId: isLocal ? input.shiftId : null,
  };
}
