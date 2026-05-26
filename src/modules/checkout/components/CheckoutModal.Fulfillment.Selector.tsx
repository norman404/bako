import { Bike, House } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  CHECKOUT_FULFILLMENT_TYPE,
  type CheckoutFulfillmentType,
} from "@/modules/checkout/hooks/use-checkout";

interface CheckoutFulfillmentSelectorProps {
  fulfillmentType: CheckoutFulfillmentType;
  onFulfillmentChange: (type: CheckoutFulfillmentType) => void;
}

function CheckoutFulfillmentSelector({ fulfillmentType, onFulfillmentChange }: CheckoutFulfillmentSelectorProps) {
  const { t } = useTranslation('checkout');
  
  const FULFILLMENT_OPTIONS = [
    { value: CHECKOUT_FULFILLMENT_TYPE.LOCAL, label: t('fulfillment.local'), icon: House },
    { value: CHECKOUT_FULFILLMENT_TYPE.DELIVERY, label: t('fulfillment.delivery'), icon: Bike },
  ];
  
  return (
    <SegmentedControl
      options={FULFILLMENT_OPTIONS}
      activeValue={fulfillmentType}
      onSelect={(value) => onFulfillmentChange(value as CheckoutFulfillmentType)}
      className="lg:max-w-[280px]"
    />
  );
}

export { CheckoutFulfillmentSelector };
