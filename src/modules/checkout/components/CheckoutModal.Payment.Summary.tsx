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
      <div className="mt-3 rounded-card border border-border bg-surface-raised px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-2xs font-medium uppercase tracking-[0.16em] text-text-muted">
          <span>{t('payment.summary.total')}</span>
          <span className="font-mono-tabular text-sm tracking-tight normal-case text-text">
            {formatPosCurrency(total)}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-2xs font-medium uppercase tracking-[0.16em] text-text-muted">
          <span>{isCashPayment ? t('payment.summary.cashReceived') : t('payment.summary.cardPayment')}</span>
          <span className="font-mono-tabular text-sm font-semibold tracking-tight normal-case text-text">
            {registeredPaymentAmount === null ? t('payment.summary.dash') : formatPosCurrency(registeredPaymentAmount)}
          </span>
        </div>

        {isCashPayment ? (
          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2.5 text-2xs font-medium uppercase tracking-[0.16em] text-text-muted">
            <span>{t('payment.summary.change')}</span>
            <span className="font-mono-tabular text-lg font-semibold tracking-tight normal-case text-primary-strong">
              {changeAmount === null ? t('payment.summary.dash') : formatPosCurrency(changeAmount)}
            </span>
          </div>
        ) : null}
      </div>

      {paymentValidationMessage ? (
        <p className="mt-3 rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger">
          {paymentValidationMessage}
        </p>
      ) : null}
    </>
  );
}

export { CheckoutPaymentSummary }
