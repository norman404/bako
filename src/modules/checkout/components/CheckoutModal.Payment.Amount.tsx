import { CreditCard, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatPosCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CHECKOUT_PAYMENT_MODE,
  type CheckoutPaymentMode,
} from "../lib/payment";

interface CheckoutPaymentAmountBlockProps {
  paymentMode: CheckoutPaymentMode;
  cashAmountInput: string;
  cashAppliedAmount: number | null;
  cardAmount: number | null;
  onCashInputChange: (value: string) => void;
  total: number;
}

function CheckoutPaymentAmountBlock({
  paymentMode,
  cashAmountInput,
  cashAppliedAmount,
  cardAmount,
  onCashInputChange,
  total,
}: CheckoutPaymentAmountBlockProps) {
  const { t } = useTranslation("checkout");

  if (paymentMode === CHECKOUT_PAYMENT_MODE.CARD) {
    return (
      <div className="mt-4 rounded-card border border-border bg-surface-raised px-3 py-3">
        <div className="flex items-center justify-between gap-3 text-2xs text-text-muted">
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            {t("payment.cardApplied")}
          </span>
          <span className="font-mono-tabular text-base font-semibold text-text">
            {formatPosCurrency(total)}
          </span>
        </div>
      </div>
    );
  }

  const isMixed = paymentMode === CHECKOUT_PAYMENT_MODE.MIXED;

  return (
    <div className="mt-4 grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="cash-amount">
          {isMixed ? t("payment.appliedLabel") : t("payment.receivedLabel")}
        </Label>
        <div className="relative">
          <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
          <Input
            id="cash-amount"
            value={cashAmountInput}
            onInput={(event) => onCashInputChange(event.currentTarget.value)}
            className="h-14 pl-10 font-mono-tabular text-xl font-semibold"
            placeholder={isMixed ? formatPosCurrency(Math.floor(total / 2)) : formatPosCurrency(total)}
            inputMode="decimal"
          />
        </div>
        <p className="text-2xs text-text-dim">
          {isMixed ? t("payment.mixedHint") : t("payment.cashHint")}
        </p>
      </div>

      {isMixed ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-primary/30 bg-primary/5 px-3 py-3">
          <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            <CreditCard className="h-4 w-4 text-primary" />
            {t("payment.cardRemaining")}
          </span>
          <span className="font-mono-tabular text-lg font-bold text-primary-strong">
            {cardAmount === null ? t("payment.summary.dash") : formatPosCurrency(cardAmount)}
          </span>
        </div>
      ) : null}

      {paymentMode === CHECKOUT_PAYMENT_MODE.CASH && cashAppliedAmount !== null ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-3 py-2.5 text-2xs text-text-muted">
          <span>{t("payment.appliedLabel")}</span>
          <span className="font-mono-tabular text-sm text-text">
            {formatPosCurrency(cashAppliedAmount)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export { CheckoutPaymentAmountBlock };
