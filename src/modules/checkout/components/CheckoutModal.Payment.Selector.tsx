import { CreditCard, Wallet } from 'lucide-react'

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  CHECKOUT_PAYMENT_METHOD,
  type CheckoutPaymentMethod
} from '@/modules/checkout/lib/builders'

const PAYMENT_OPTIONS = [
  { value: CHECKOUT_PAYMENT_METHOD.CASH, label: 'Efectivo', icon: Wallet },
  { value: CHECKOUT_PAYMENT_METHOD.CARD, label: 'Tarjeta', icon: CreditCard },
]

interface CheckoutPaymentMethodSelectorProps {
  isCashPayment: boolean
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void
}

function CheckoutPaymentMethodSelector({ isCashPayment, onPaymentMethodChange }: CheckoutPaymentMethodSelectorProps) {
  return (
    <SegmentedControl
      options={PAYMENT_OPTIONS}
      activeValue={isCashPayment ? CHECKOUT_PAYMENT_METHOD.CASH : CHECKOUT_PAYMENT_METHOD.CARD}
      onSelect={(value) => onPaymentMethodChange(value as CheckoutPaymentMethod)}
      className="mt-3"
    />
  )
}

export { CheckoutPaymentMethodSelector }
