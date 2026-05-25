import { CheckoutPaymentAmountBlock } from '@/features/checkout/components/checkout-modal.payment.amount'
import { CheckoutPaymentMethodSelector } from '@/features/checkout/components/checkout-modal.payment.selector'
import { CheckoutPaymentSummary } from '@/features/checkout/components/checkout-modal.payment.summary'
import type { CheckoutPaymentMethod } from '@/features/checkout/lib/builders'
import type { CartTotals } from '@/features/order/domain/cart'
import { formatPosCurrency } from '@/shared/lib/currency'

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
  return (
    <div className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-2.5">
        <h3 className="text-[15px] font-medium text-ink">Pago</h3>
        <span className="font-mono-tabular text-[20px] font-semibold tracking-[-0.02em] text-champagne">
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
