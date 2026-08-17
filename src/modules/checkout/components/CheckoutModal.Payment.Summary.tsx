import { CreditCard, Wallet, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatPosCurrency } from "@/lib/currency";
import { CHECKOUT_PAYMENT_MODE, type CheckoutPaymentMode } from "../lib/payment";

interface CheckoutPaymentSummaryProps {
  total: number;
  paymentMode: CheckoutPaymentMode;
  cashAppliedAmount: number | null;
  cashReceivedAmount: number | null;
  cardAmount: number | null;
  changeAmount: number | null;
  paymentValidationMessage: string | null;
}

interface PaymentSummaryRowProps {
  label: string;
  value: number | null;
  icon: LucideIcon;
  emphasized?: boolean;
}

function PaymentSummaryRow({
  label,
  value,
  icon: Icon,
  emphasized = false,
}: PaymentSummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-2xs font-medium uppercase tracking-[0.14em] text-text-muted">
      <span className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </span>
      <span
        className={`font-mono-tabular text-sm tracking-tight normal-case ${
          emphasized ? "font-bold text-primary-strong" : "text-text"
        }`}
      >
        {value === null ? "—" : formatPosCurrency(value)}
      </span>
    </div>
  );
}

function CheckoutPaymentSummary({
  total,
  paymentMode,
  cashAppliedAmount,
  cashReceivedAmount,
  cardAmount,
  changeAmount,
  paymentValidationMessage,
}: CheckoutPaymentSummaryProps) {
  const { t } = useTranslation("checkout");
  const isMixed = paymentMode === CHECKOUT_PAYMENT_MODE.MIXED;
  const isCash = paymentMode === CHECKOUT_PAYMENT_MODE.CASH;

  return (
    <>
      <div className="mt-4 grid gap-3 rounded-card border border-border bg-surface-raised px-3 py-3">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">
          <span>{t("payment.summary.total")}</span>
          <span className="font-mono-tabular text-base tracking-tight text-text">
            {formatPosCurrency(total)}
          </span>
        </div>

        {isCash || isMixed ? (
          <PaymentSummaryRow
            label={isMixed ? t("payment.summary.cashApplied") : t("payment.summary.cashReceived")}
            value={isMixed ? cashAppliedAmount : cashReceivedAmount}
            icon={Wallet}
          />
        ) : null}

        {paymentMode === CHECKOUT_PAYMENT_MODE.CARD || isMixed ? (
          <PaymentSummaryRow
            label={t("payment.summary.cardPayment")}
            value={cardAmount}
            icon={CreditCard}
          />
        ) : null}

        {isCash ? (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            <span>{t("payment.summary.change")}</span>
            <span className="font-mono-tabular text-xl tracking-tight text-primary-strong">
              {changeAmount === null ? "—" : formatPosCurrency(changeAmount)}
            </span>
          </div>
        ) : null}

        {isMixed && cardAmount !== null && cashAppliedAmount !== null ? (
          <p className="text-2xs font-medium text-success">{t("payment.complete")}</p>
        ) : null}
      </div>

      {paymentValidationMessage ? (
        <p className="mt-3 rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger">
          {paymentValidationMessage}
        </p>
      ) : null}
    </>
  );
}

export { CheckoutPaymentSummary };
