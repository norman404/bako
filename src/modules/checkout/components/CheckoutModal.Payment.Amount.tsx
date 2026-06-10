import { Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { formatPaymentAmountInput } from '@/modules/checkout/lib/formatters';
import { formatPosCurrency } from '@/lib/currency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CheckoutPaymentAmountBlockProps {
  isCashPayment: boolean
  cashAmountInput: string
  onCashInputChange: (value: string) => void
  total: number
}

function CheckoutPaymentAmountBlock({
  isCashPayment,
  cashAmountInput,
  onCashInputChange,
  total
}: CheckoutPaymentAmountBlockProps) {
  const { t } = useTranslation('checkout');
  
  if (isCashPayment) {
    return (
      <div className="grid gap-1 mt-3">
        <Label htmlFor="cash-amount">{t('payment.receivedLabel')}</Label>
        <div className="relative">
          <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
          <Input
            id="cash-amount"
            value={cashAmountInput}
            onInput={(event) => onCashInputChange(event.currentTarget.value)}
            className="h-12 pl-10 font-mono-tabular text-lg"
            placeholder={formatPaymentAmountInput(total)}
            inputMode="decimal"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-card border border-border bg-surface-raised px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-2xs text-text-muted">
        <span>{t('payment.exactPayment')}</span>
        <span className="font-mono-tabular text-sm text-text">{formatPosCurrency(total)}</span>
      </div>
    </div>
  );
}

export { CheckoutPaymentAmountBlock }
