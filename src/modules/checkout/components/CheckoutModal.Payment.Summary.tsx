import { formatPosCurrency } from '@/lib/currency';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('checkout');
  
  return (
    <>
      <div className="mt-3 rounded-card border border-hairline bg-obsidian px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
          <span>{t('payment.summary.total')}</span>
          <span className="font-mono-tabular text-[13px] tracking-tight normal-case text-ink">
            {formatPosCurrency(total)}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
          <span>{isCashPayment ? t('payment.summary.cashReceived') : t('payment.summary.cardPayment')}</span>
          <span className="font-mono-tabular text-[13px] font-semibold tracking-tight normal-case text-ink">
            {registeredPaymentAmount === null ? t('payment.summary.dash') : formatPosCurrency(registeredPaymentAmount)}
          </span>
        </div>

        {isCashPayment ? (
          <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
            <span>{t('payment.summary.change')}</span>
            <span className="font-mono-tabular text-[14px] font-semibold tracking-tight normal-case text-champagne">
              {changeAmount === null ? t('payment.summary.dash') : formatPosCurrency(changeAmount)}
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
  );
}

export { CheckoutPaymentSummary }
