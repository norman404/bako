import type { CartItem, CartTotals } from "@/modules/order/domain/cart";
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
    <section className="rounded-card border border-border bg-surface-sunken px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-strong pb-2.5">
        <h3 className="text-md font-semibold text-text">{t('orderSummary.title')}</h3>
        <span className="font-mono-tabular text-xl font-semibold text-primary-strong">
          {formatPosCurrency(totals.total)}
        </span>
      </div>

      <div className="scrollbar-thin mt-3 max-h-44 space-y-2 overflow-y-auto pr-1 sm:max-h-48">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t border-border pt-2.5 first:border-t-0 first:pt-0"
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
          </div>
        ))}
      </div>
    </section>
  );
}

export { CheckoutModalOrderSummary };
