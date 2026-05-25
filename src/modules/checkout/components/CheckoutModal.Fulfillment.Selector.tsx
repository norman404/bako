import { Bike, House } from "lucide-react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  CHECKOUT_FULFILLMENT_TYPE,
  type CheckoutFulfillmentType,
} from "@/modules/checkout/hooks/use-checkout";

const FULFILLMENT_OPTIONS = [
  { value: CHECKOUT_FULFILLMENT_TYPE.LOCAL, label: 'Local', icon: House },
  { value: CHECKOUT_FULFILLMENT_TYPE.DELIVERY, label: 'Delivery', icon: Bike },
]

interface CheckoutFulfillmentSelectorProps {
  fulfillmentType: CheckoutFulfillmentType;
  onFulfillmentChange: (type: CheckoutFulfillmentType) => void;
}

function CheckoutFulfillmentSelector({ fulfillmentType, onFulfillmentChange }: CheckoutFulfillmentSelectorProps) {
  return (
    <SegmentedControl
      options={FULFILLMENT_OPTIONS}
      activeValue={fulfillmentType}
      onSelect={(value) => onFulfillmentChange(value as CheckoutFulfillmentType)}
      className="lg:max-w-[280px]"
    />
  )
}

export { CheckoutFulfillmentSelector };
