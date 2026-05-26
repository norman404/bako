import { CreditCard, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutPaymentMethod
} from '@/modules/checkout/lib/builders';

interface CheckoutPaymentMethodSelectorProps {
  isCashPayment: boolean;
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void;
}

function CheckoutPaymentMethodSelector({ isCashPayment, onPaymentMethodChange }: CheckoutPaymentMethodSelectorProps) {
  const { t } = useTranslation('checkout');
  
  const PAYMENT_OPTIONS = [
    { value: CHECKOUT_PAYMENT_METHOD.CASH, label: t('payment.cash'), icon: Wallet },
    { value: CHECKOUT_PAYMENT_METHOD.CARD, label: t('payment.card'), icon: CreditCard },
  ];
  
  return (
    <SegmentedControl
      options={PAYMENT_OPTIONS}
      activeValue={isCashPayment ? CHECKOUT_PAYMENT_METHOD.CASH : CHECKOUT_PAYMENT_METHOD.CARD}
      onSelect={(value) => onPaymentMethodChange(value as CheckoutPaymentMethod)}
      className="mt-3"
    />
  );
}

export { CheckoutPaymentMethodSelector }
