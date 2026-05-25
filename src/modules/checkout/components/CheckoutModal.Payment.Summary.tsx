import { formatPosCurrency } from '@/lib/currency'

interface CheckoutPaymentSummaryProps {
  total: number
  isCashPayment: boolean
  registeredPaymentAmount: number | null
  changeAmount: number | null
  paymentValidationMessage: string | null
}

function CheckoutPaymentSummary({
  total,
  isCashPayment,
  registeredPaymentAmount,
  changeAmount,
  paymentValidationMessage
}: CheckoutPaymentSummaryProps) {
  return (
    <>
      <div className="mt-3 rounded-card border border-hairline bg-obsidian px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
          <span>Total final</span>
          <span className="font-mono-tabular text-[13px] tracking-tight normal-case text-ink">
            {formatPosCurrency(total)}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
          <span>{isCashPayment ? 'Efectivo recibido' : 'Cobro con tarjeta'}</span>
          <span className="font-mono-tabular text-[13px] font-semibold tracking-tight normal-case text-ink">
            {registeredPaymentAmount === null ? '—' : formatPosCurrency(registeredPaymentAmount)}
          </span>
        </div>

        {isCashPayment ? (
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            <span>Cambio</span>
            <span className="font-mono-tabular text-[14px] font-semibold tracking-tight normal-case text-champagne">
              {changeAmount === null ? '—' : formatPosCurrency(changeAmount)}
            </span>
          </div>
        ) : null}
      </div>

      {paymentValidationMessage ? (
        <p className="mt-3 rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
          {paymentValidationMessage}
        </p>
      ) : null}
    </>
  )
}

export { CheckoutPaymentSummary }
