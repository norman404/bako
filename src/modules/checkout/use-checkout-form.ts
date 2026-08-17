import { useState } from "react";

import { useTranslation } from "react-i18next";

import type { CreateOrderInput } from "./order";
import { translateCheckoutError } from "./lib/translate-checkout-error";
import {
  buildCreateOrderInput,
  CHECKOUT_PAYMENT_MODE,
  getPaymentValidationMessage,
  type CheckoutPaymentMode,
} from "./lib/builders";
import {
  calculatePaymentBreakdown,
  defaultCashAmountInput,
  type PaymentBreakdown,
} from "./lib/payment";
import {
  parsePaymentAmountInput,
  sanitizePaymentAmountInput,
} from "./lib/formatters";
import { calculateCartTotals, type CartItem } from "@/modules/order";

interface UseCheckoutFormOptions {
  open: boolean;
  items: CartItem[];
  totals?: ReturnType<typeof calculateCartTotals>;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirmCheckout: (input: CreateOrderInput) => Promise<void>;
}

export function computeReceivedAmount(
  paymentMode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
): number | null {
  return calculatePaymentBreakdown(paymentMode, cashAmountInput, total).cashReceived;
}

export function computeChangeAmount(
  paymentMode: CheckoutPaymentMode,
  cashAmountInput: string,
  total: number,
): number | null {
  return calculatePaymentBreakdown(paymentMode, cashAmountInput, total).changeAmount;
}

export function computeIsDisabled(
  items: CartItem[],
  isSubmitting: boolean,
  paymentValidationMessage: string | null,
): boolean {
  return items.length === 0 || isSubmitting || paymentValidationMessage !== null;
}

function getDefaultCashInput(paymentMode: CheckoutPaymentMode, total: number): string {
  if (paymentMode === CHECKOUT_PAYMENT_MODE.MIXED) {
    const mixedCashAmount = Math.max(1, Math.floor(total / 2));
    return defaultCashAmountInput(mixedCashAmount);
  }

  return defaultCashAmountInput(total);
}

function getPaymentSummary(breakdown: PaymentBreakdown) {
  return {
    cashAppliedAmount: breakdown.cashApplied,
    cashReceivedAmount: breakdown.cashReceived,
    cardAmount: breakdown.cardAmount,
    changeAmount: breakdown.changeAmount,
  };
}

export function useCheckoutForm({
  items,
  totals,
  isSubmitting = false,
  onClose,
  onConfirmCheckout,
}: UseCheckoutFormOptions) {
  const { t } = useTranslation("checkout");
  const normalizedTotals = totals ?? calculateCartTotals(items);

  const [paymentMode, setPaymentMode] = useState<CheckoutPaymentMode>(
    CHECKOUT_PAYMENT_MODE.CASH,
  );
  const [cashAmountInput, setCashAmountInput] = useState(() =>
    getDefaultCashInput(CHECKOUT_PAYMENT_MODE.CASH, normalizedTotals.total),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isCashPayment = paymentMode !== CHECKOUT_PAYMENT_MODE.CARD;
  const isMixedPayment = paymentMode === CHECKOUT_PAYMENT_MODE.MIXED;
  const paymentValidationMessage = getPaymentValidationMessage(
    paymentMode,
    cashAmountInput,
    normalizedTotals.total,
  );
  const breakdown = calculatePaymentBreakdown(
    paymentMode,
    cashAmountInput,
    normalizedTotals.total,
  );
  const paymentSummary = getPaymentSummary(breakdown);
  const isDisabled = computeIsDisabled(items, isSubmitting, paymentValidationMessage);

  const handleCloseRequest = () => {
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    onClose();
  };

  const handlePaymentModeChange = (nextMode: CheckoutPaymentMode) => {
    setPaymentMode(nextMode);
    setFormError(null);

    const currentCashAmount = parsePaymentAmountInput(cashAmountInput);
    if (
      nextMode !== CHECKOUT_PAYMENT_MODE.CARD &&
      (currentCashAmount === null ||
        (nextMode === CHECKOUT_PAYMENT_MODE.MIXED && currentCashAmount >= normalizedTotals.total))
    ) {
      setCashAmountInput(getDefaultCashInput(nextMode, normalizedTotals.total));
    }
  };

  const handleCashInputChange = (value: string) => {
    setFormError(null);
    setCashAmountInput(sanitizePaymentAmountInput(value));
  };

  const handleConfirm = async () => {
    if (isDisabled) {
      return;
    }

    const payload = buildCreateOrderInput(
      items,
      paymentMode,
      cashAmountInput,
      normalizedTotals.total,
    );
    if (!payload) {
      setFormError(paymentValidationMessage ?? t("errors.formEmptyCart"));
      return;
    }

    try {
      setFormError(null);
      await onConfirmCheckout(payload);
    } catch (error) {
      setFormError(translateCheckoutError(error, t));
    }
  };

  return {
    paymentMode,
    cashAmountInput,
    formError,
    isCashPayment,
    isMixedPayment,
    paymentValidationMessage,
    ...paymentSummary,
    isDisabled,
    handleCloseRequest,
    handlePaymentModeChange,
    handleCashInputChange,
    handleConfirm,
  };
}
