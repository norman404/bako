import {
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutPaymentInput,
  type CheckoutPaymentMethod,
} from "../order";
import { formatPaymentAmountInput, parsePaymentAmountInput } from "./formatters";
import { formatPosCurrency } from "@/lib/currency";

export const CHECKOUT_PAYMENT_MODE = {
  CASH: "cash",
  CARD: "card",
  MIXED: "mixed",
} as const;

export type CheckoutPaymentMode =
  (typeof CHECKOUT_PAYMENT_MODE)[keyof typeof CHECKOUT_PAYMENT_MODE];

export interface PaymentBreakdown {
  cashApplied: number | null;
  cashReceived: number | null;
  cardAmount: number | null;
  changeAmount: number | null;
}

function parseCashAmount(cashAmountInput: string): number | null {
  return parsePaymentAmountInput(cashAmountInput);
}

export function calculatePaymentBreakdown(
  mode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
): PaymentBreakdown {
  if (mode === CHECKOUT_PAYMENT_MODE.CARD) {
    return {
      cashApplied: null,
      cashReceived: null,
      cardAmount: total,
      changeAmount: null,
    };
  }

  const cashInput = parseCashAmount(cashAmountInput);
  if (cashInput === null) {
    return {
      cashApplied: null,
      cashReceived: null,
      cardAmount: mode === CHECKOUT_PAYMENT_MODE.MIXED ? null : 0,
      changeAmount: null,
    };
  }

  if (mode === CHECKOUT_PAYMENT_MODE.MIXED) {
    const cashApplied = Math.min(Math.max(cashInput, 0), total);
    const cardAmount = Math.max(total - cashApplied, 0);

    return {
      cashApplied,
      cashReceived: cashApplied,
      cardAmount,
      changeAmount: null,
    };
  }

  const cashApplied = total;
  return {
    cashApplied,
    cashReceived: cashInput,
    cardAmount: null,
    changeAmount: Math.max(cashInput - total, 0),
  };
}

export function getPaymentValidationMessage(
  mode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
): string | null {
  if (mode === CHECKOUT_PAYMENT_MODE.CARD) {
    return null;
  }

  const cashAmount = parseCashAmount(cashAmountInput);
  if (cashAmount === null) {
    return mode === CHECKOUT_PAYMENT_MODE.MIXED
      ? "Ingresá el efectivo aplicado."
      : "Ingresá el monto recibido en efectivo.";
  }

  if (mode === CHECKOUT_PAYMENT_MODE.MIXED) {
    if (cashAmount <= 0 || cashAmount >= total) {
      return `El efectivo mixto debe estar entre $0 y ${formatPosCurrency(total)}.`;
    }

    return null;
  }

  if (cashAmount < total) {
    return `El efectivo recibido debe cubrir ${formatPosCurrency(total)}.`;
  }

  return null;
}

export function buildPaymentInputs(
  mode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
): CheckoutPaymentInput[] | null {
  const validationMessage = getPaymentValidationMessage(mode, cashAmountInput, total);
  if (validationMessage !== null) {
    return null;
  }

  const breakdown = calculatePaymentBreakdown(mode, cashAmountInput, total);

  if (mode === CHECKOUT_PAYMENT_MODE.CARD && breakdown.cardAmount !== null) {
    return [
      {
        method: CHECKOUT_PAYMENT_METHOD.CARD,
        amount: breakdown.cardAmount,
        cashReceived: null,
      },
    ];
  }

  if (mode === CHECKOUT_PAYMENT_MODE.CASH && breakdown.cashApplied !== null) {
    return [
      {
        method: CHECKOUT_PAYMENT_METHOD.CASH,
        amount: breakdown.cashApplied,
        cashReceived: breakdown.cashReceived,
      },
    ];
  }

  if (
    mode === CHECKOUT_PAYMENT_MODE.MIXED &&
    breakdown.cashApplied !== null &&
    breakdown.cardAmount !== null
  ) {
    return [
      {
        method: CHECKOUT_PAYMENT_METHOD.CASH,
        amount: breakdown.cashApplied,
        cashReceived: breakdown.cashReceived,
      },
      {
        method: CHECKOUT_PAYMENT_METHOD.CARD,
        amount: breakdown.cardAmount,
        cashReceived: null,
      },
    ];
  }

  return null;
}

export function defaultCashAmountInput(total: number): string {
  return formatPaymentAmountInput(total);
}

export type { CheckoutPaymentMethod };
