import { Wallet } from 'lucide-react'

import { formatPaymentAmountInput } from '@/modules/checkout/lib/formatters'
import { formatPosCurrency } from '@/lib/currency'

interface CheckoutPaymentAmountBlockProps {
  isCashPayment: boolean
  cashAmountInput: string
  onCashInputChange: (value: string) => void
  total: number
}

const FIELD_INPUT_CLASS = [
  'h-9 w-full rounded-card border border-hairline bg-obsidian px-3',
  'text-[13px] text-ink outline-none',
  'placeholder:text-ink-dim',
  'transition-colors duration-150',
  'focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20'
].join(' ')

const FIELD_LABEL_CLASS =
  'grid gap-1 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim'

function CheckoutPaymentAmountBlock({
  isCashPayment,
  cashAmountInput,
  onCashInputChange,
  total
}: CheckoutPaymentAmountBlockProps) {
  if (isCashPayment) {
    return (
      <label className={`${FIELD_LABEL_CLASS} mt-3`}>
        Recibido
        <div className="relative">
          <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            value={cashAmountInput}
            onInput={(event) => onCashInputChange(event.currentTarget.value)}
            className={`${FIELD_INPUT_CLASS} pl-10`}
            placeholder={formatPaymentAmountInput(total)}
            inputMode="decimal"
          />
        </div>
      </label>
    )
  }

  return (
    <div className="mt-3 rounded-card border border-hairline bg-obsidian px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-[11px] text-ink-muted">
        <span>Cobro exacto</span>
        <span className="font-mono-tabular text-ink">{formatPosCurrency(total)}</span>
      </div>
    </div>
  )
}

export { CheckoutPaymentAmountBlock }
