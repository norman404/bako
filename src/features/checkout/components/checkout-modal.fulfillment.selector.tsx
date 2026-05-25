import { Bike, House } from "lucide-react";

import {
  CHECKOUT_FULFILLMENT_TYPE,
  type CheckoutFulfillmentType,
} from "@/features/checkout/hooks/use-checkout";

interface CheckoutFulfillmentSelectorProps {
  fulfillmentType: CheckoutFulfillmentType;
  onFulfillmentChange: (type: CheckoutFulfillmentType) => void;
}

function getSegmentedButtonClass(isActive: boolean): string {
  return [
    "rounded-card border px-3 py-2.5 text-left transition-[border-color,background-color,color] duration-150",
    isActive
      ? "segmented-option-active text-ink"
      : "segmented-option-inactive border-transparent text-ink-muted hover:border-hairline-strong hover:text-ink",
  ].join(" ");
}

function getSegmentedIconClass(isActive: boolean): string {
  return [
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-card border transition-colors duration-150",
    isActive
      ? "border-champagne/45 bg-[#0f0f10]/70 text-champagne"
      : "border-hairline bg-obsidian text-ink-dim",
  ].join(" ");
}

function CheckoutFulfillmentSelector({
  fulfillmentType,
  onFulfillmentChange,
}: CheckoutFulfillmentSelectorProps) {
  return (
    <div className="grid w-full gap-1.5 rounded-card border border-hairline p-1 sm:grid-cols-2 lg:max-w-[280px]">
      <button
        type="button"
        onClick={() => onFulfillmentChange(CHECKOUT_FULFILLMENT_TYPE.LOCAL)}
        className={getSegmentedButtonClass(fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.LOCAL)}
      >
        <div className="flex items-center gap-2.5">
          <span className={getSegmentedIconClass(fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.LOCAL)}>
            <House className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current">
            Local
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onFulfillmentChange(CHECKOUT_FULFILLMENT_TYPE.DELIVERY)}
        className={getSegmentedButtonClass(
          fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={getSegmentedIconClass(
              fulfillmentType === CHECKOUT_FULFILLMENT_TYPE.DELIVERY,
            )}
          >
            <Bike className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current">
            Delivery
          </span>
        </div>
      </button>
    </div>
  );
}

export { CheckoutFulfillmentSelector };
