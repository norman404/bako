import { ORDER_CHANNEL, type OrderChannel } from "@/modules/order";
import { parseProductPriceInput } from "@/modules/menu";
import { ShiftPersistenceError } from "./errors";

export const DELIVERY_PAYMENT_METHOD = {
  CASH: "cash",
  PLATFORM: "platform",
} as const;

export type DeliveryPaymentMethod = (typeof DELIVERY_PAYMENT_METHOD)[keyof typeof DELIVERY_PAYMENT_METHOD];

// Ticket amounts cross the native boundary as u32 cents.
export const MAX_DELIVERY_AMOUNT = 4_294_967_295;

export function parseDeliveryAmount(value: string): number | null {
  if (!/^(?:\d+|\d*[.,]\d{1,2})$/.test(value.trim())) return null;
  const amount = parseProductPriceInput(value);
  return amount !== null && Number.isSafeInteger(amount) && amount <= MAX_DELIVERY_AMOUNT ? amount : null;
}

export interface ConfirmDeliveryInput {
  amount: number;
  method: DeliveryPaymentMethod;
  shiftId: string | null;
}

export interface PendingDelivery {
  id: string;
  ticketNumber: number;
  orderName: string | null;
  channel: OrderChannel;
  deliveryReference: string | null;
  createdAt: Date;
  itemCount: number;
  catalogTotal: number;
}

export interface DeliveryConfirmationState {
  channel: string;
  confirmedAt: Date | null;
  voidedAt: Date | null;
  catalogTotal: number;
}

export function validateDeliveryConfirmation(
  order: DeliveryConfirmationState,
  input: ConfirmDeliveryInput,
): ShiftPersistenceError | null {
  if (order.channel !== ORDER_CHANNEL.UBER && order.channel !== ORDER_CHANNEL.DIDI) {
    return new ShiftPersistenceError("deliveryRequired");
  }
  if (order.voidedAt !== null) return new ShiftPersistenceError("orderAlreadyVoided");
  if (order.confirmedAt !== null) return new ShiftPersistenceError("deliveryAlreadyConfirmed");
  if (input.method !== DELIVERY_PAYMENT_METHOD.CASH && input.method !== DELIVERY_PAYMENT_METHOD.PLATFORM) {
    return new ShiftPersistenceError("invalidOrderPayment");
  }
  const amount = input.method === DELIVERY_PAYMENT_METHOD.PLATFORM ? order.catalogTotal : input.amount;
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_DELIVERY_AMOUNT) {
    return new ShiftPersistenceError("invalidDeliveryAmount");
  }
  return null;
}

export function buildDeliveryConfirmation(order: DeliveryConfirmationState, input: ConfirmDeliveryInput, now: Date) {
  const error = validateDeliveryConfirmation(order, input);
  if (error) throw error;
  const isPlatform = input.method === DELIVERY_PAYMENT_METHOD.PLATFORM;
  const total = isPlatform ? order.catalogTotal : input.amount;
  return {
    payment: {
      method: input.method,
      amount: isPlatform ? 0 : input.amount,
      cashReceived: input.method === DELIVERY_PAYMENT_METHOD.CASH ? input.amount : null,
      createdAt: now,
    },
    order: { total, confirmedAt: now, financialShiftId: input.shiftId },
  };
}
