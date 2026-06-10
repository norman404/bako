import { CheckoutPaymentAmountBlock } from '@/modules/checkout/components/CheckoutModal.Payment.Amount'
import { CheckoutPaymentMethodSelector } from '@/modules/checkout/components/CheckoutModal.Payment.Selector'
import { CheckoutPaymentSummary } from '@/modules/checkout/components/CheckoutModal.Payment.Summary'
import type { CheckoutPaymentMethod } from '@/modules/checkout/lib/builders'
import type { CartTotals } from '@/modules/order/domain/cart'
import { formatPosCurrency } from '@/lib/currency'
import { useTranslation } from 'react-i18next'

interface CheckoutModalPaymentPanelProps {
  totals: CartTotals
  isCashPayment: boolean
  cashAmountInput: string
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void
  onCashInputChange: (value: string) => void
  paymentValidationMessage: string | null
  registeredPaymentAmount: number | null
  changeAmount: number | null
}

function CheckoutModalPaymentPanel({
  totals,
  isCashPayment,
  cashAmountInput,
  onPaymentMethodChange,
  onCashInputChange,
  paymentValidationMessage,
  registeredPaymentAmount,
  changeAmount
}: CheckoutModalPaymentPanelProps) {
  const { t } = useTranslation('checkout');
  
  return (
    <div className="rounded-card border border-border bg-surface-sunken px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-strong pb-2.5">
        <h3 className="text-md font-semibold text-text">{t('payment.title')}</h3>
        <span className="font-mono-tabular text-xl font-semibold text-primary-strong">
          {formatPosCurrency(totals.total)}
        </span>
      </div>

      <CheckoutPaymentMethodSelector
        isCashPayment={isCashPayment}
        onPaymentMethodChange={onPaymentMethodChange}
      />

      <CheckoutPaymentAmountBlock
        isCashPayment={isCashPayment}
        cashAmountInput={cashAmountInput}
        onCashInputChange={onCashInputChange}
        total={totals.total}
      />

      <CheckoutPaymentSummary
        total={totals.total}
        isCashPayment={isCashPayment}
        registeredPaymentAmount={registeredPaymentAmount}
        changeAmount={changeAmount}
        paymentValidationMessage={paymentValidationMessage}
      />
    </div>
  )
}

export { CheckoutModalPaymentPanel }
