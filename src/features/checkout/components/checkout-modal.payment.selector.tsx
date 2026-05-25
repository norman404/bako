import { CreditCard, Wallet } from 'lucide-react'

import {
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutPaymentMethod
} from '@/features/checkout/lib/builders'

interface CheckoutPaymentMethodSelectorProps {
  isCashPayment: boolean
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void
}

function getSegmentedButtonClass(isActive: boolean): string {
  return [
    'rounded-card border px-3 py-2.5 text-left transition-[border-color,background-color,color] duration-150',
    isActive
      ? 'segmented-option-active text-ink'
      : 'segmented-option-inactive border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink'
  ].join(' ')
}

function getSegmentedIconClass(isActive: boolean): string {
  return [
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-card border transition-colors duration-150',
    isActive
      ? 'border-champagne/45 bg-[#0f0f10]/70 text-champagne'
      : 'border-hairline bg-obsidian text-ink-dim'
  ].join(' ')
}

function CheckoutPaymentMethodSelector({
  isCashPayment,
  onPaymentMethodChange
}: CheckoutPaymentMethodSelectorProps) {
  return (
    <div className="mt-3 grid gap-1.5 rounded-card border border-hairline p-1 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onPaymentMethodChange(CHECKOUT_PAYMENT_METHOD.CASH)}
        aria-pressed={isCashPayment}
        className={getSegmentedButtonClass(isCashPayment)}
      >
        <div className="flex items-center gap-2.5">
          <span className={getSegmentedIconClass(isCashPayment)}>
            <Wallet className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current">
            Efectivo
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onPaymentMethodChange(CHECKOUT_PAYMENT_METHOD.CARD)}
        aria-pressed={!isCashPayment}
        className={getSegmentedButtonClass(!isCashPayment)}
      >
        <div className="flex items-center gap-2.5">
          <span className={getSegmentedIconClass(!isCashPayment)}>
            <CreditCard className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current">
            Tarjeta
          </span>
        </div>
      </button>
    </div>
  )
}

export { CheckoutPaymentMethodSelector }
