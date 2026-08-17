import type { CartItem, CartTotals } from "@/modules/order";
import { formatPosCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface CheckoutModalOrderSummaryProps {
  items: CartItem[];
  totals: CartTotals;
}

function CheckoutModalOrderSummary({
  items,
  totals,
}: CheckoutModalOrderSummaryProps) {
  const { t } = useTranslation('checkout');
  
  return (
    <section
      aria-labelledby="checkout-order-summary-title"
      className="self-start rounded-card border border-border bg-surface-sunken px-3 py-3 sm:px-4 sm:py-4"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-strong pb-2.5">
        <h3 id="checkout-order-summary-title" className="text-md font-semibold text-text">
          {t('orderSummary.title')}
        </h3>
        <span className="font-mono-tabular text-xl font-semibold text-primary-strong">
          {formatPosCurrency(totals.total)}
        </span>
      </div>

      <ul aria-labelledby="checkout-order-summary-title" className="mt-3 divide-y divide-border">
        {items.map((item) => (
          <li
            key={item.lineId}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight text-text">
                {item.product.name}
              </p>
              <p className="mt-1 font-mono-tabular text-2xs text-text-dim">
                {item.quantity} × {formatPosCurrency(item.product.price)}
              </p>
            </div>
            <p className="font-mono-tabular text-xs tracking-tight text-text">
              {formatPosCurrency(item.product.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { CheckoutModalOrderSummary };
