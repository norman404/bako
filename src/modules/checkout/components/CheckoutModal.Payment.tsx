import { useTranslation } from "react-i18next";

import { formatPosCurrency } from "@/lib/currency";
import type { CartTotals } from "@/modules/order";
import { CheckoutPaymentAmountBlock } from "./CheckoutModal.Payment.Amount";
import { CheckoutPaymentMethodSelector } from "./CheckoutModal.Payment.Selector";
import { CheckoutPaymentSummary } from "./CheckoutModal.Payment.Summary";
import type { CheckoutPaymentMode } from "../lib/payment";

interface CheckoutModalPaymentPanelProps {
  totals: CartTotals;
  paymentMode: CheckoutPaymentMode;
  cashAmountInput: string;
  cashAppliedAmount: number | null;
  cashReceivedAmount: number | null;
  cardAmount: number | null;
  changeAmount: number | null;
  onPaymentModeChange: (mode: CheckoutPaymentMode) => void;
  onCashInputChange: (value: string) => void;
  paymentValidationMessage: string | null;
}

function CheckoutModalPaymentPanel({
  totals,
  paymentMode,
  cashAmountInput,
  cashAppliedAmount,
  cashReceivedAmount,
  cardAmount,
  changeAmount,
  onPaymentModeChange,
  onCashInputChange,
  paymentValidationMessage,
}: CheckoutModalPaymentPanelProps) {
  const { t } = useTranslation("checkout");

  return (
    <section className="rounded-card border border-primary/40 bg-surface-sunken px-3 py-3 shadow-card sm:px-4 sm:py-4">
      <div className="flex items-start justify-between gap-3 border-b border-border-strong pb-3">
        <div>
          <p className="eyebrow text-primary">{t("payment.eyebrow")}</p>
          <h3 className="mt-1 text-lg font-semibold text-text">{t("payment.title")}</h3>
        </div>
        <span className="font-mono-tabular text-2xl font-bold tracking-tight text-primary-strong">
          {formatPosCurrency(totals.total)}
        </span>
      </div>

      <CheckoutPaymentMethodSelector
        paymentMode={paymentMode}
        onPaymentModeChange={onPaymentModeChange}
      />

      <CheckoutPaymentAmountBlock
        paymentMode={paymentMode}
        cashAmountInput={cashAmountInput}
        cashAppliedAmount={cashAppliedAmount}
        cardAmount={cardAmount}
        onCashInputChange={onCashInputChange}
        total={totals.total}
      />

      <CheckoutPaymentSummary
        total={totals.total}
        paymentMode={paymentMode}
        cashAppliedAmount={cashAppliedAmount}
        cashReceivedAmount={cashReceivedAmount}
        cardAmount={cardAmount}
        changeAmount={changeAmount}
        paymentValidationMessage={paymentValidationMessage}
      />
    </section>
  );
}

export { CheckoutModalPaymentPanel };
