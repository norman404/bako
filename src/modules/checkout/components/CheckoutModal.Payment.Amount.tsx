import { Wallet } from 'lucide-react'

import { formatPaymentAmountInput } from '@/modules/checkout/lib/formatters'
import { formatPosCurrency } from '@/lib/currency'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  if (isCashPayment) {
    return (
      <div className="grid gap-1 mt-3">
        <Label htmlFor="cash-amount">Recibido</Label>
        <div className="relative">
          <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <Input
            id="cash-amount"
            value={cashAmountInput}
            onInput={(event) => onCashInputChange(event.currentTarget.value)}
            className="pl-10"
            placeholder={formatPaymentAmountInput(total)}
            inputMode="decimal"
          />
        </div>
      </div>
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
