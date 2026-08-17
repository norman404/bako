import { CreditCard, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  CHECKOUT_PAYMENT_MODE,
  type CheckoutPaymentMode,
} from "../lib/payment";

interface CheckoutPaymentMethodSelectorProps {
  paymentMode: CheckoutPaymentMode;
  onPaymentModeChange: (mode: CheckoutPaymentMode) => void;
}

function CheckoutPaymentMethodSelector({
  paymentMode,
  onPaymentModeChange,
}: CheckoutPaymentMethodSelectorProps) {
  const { t } = useTranslation("checkout");

  const paymentOptions = [
    { value: CHECKOUT_PAYMENT_MODE.CASH, label: t("payment.cash"), icon: Wallet },
    { value: CHECKOUT_PAYMENT_MODE.CARD, label: t("payment.card"), icon: CreditCard },
    { value: CHECKOUT_PAYMENT_MODE.MIXED, label: t("payment.mixed"), icon: Wallet },
  ];

  return (
    <SegmentedControl
      options={paymentOptions}
      activeValue={paymentMode}
      onSelect={(value) => onPaymentModeChange(value as CheckoutPaymentMode)}
      className="mt-4 sm:grid-cols-3"
    />
  );
}

export { CheckoutPaymentMethodSelector };
