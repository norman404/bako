import { getLinePricing, type CartItem, type CartPricing } from "@/modules/order";
import { formatPosCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface CheckoutModalOrderSummaryProps {
  items: CartItem[];
  pricing: CartPricing;
}

function CheckoutModalOrderSummary({
  items,
  pricing,
}: CheckoutModalOrderSummaryProps) {
  const { t } = useTranslation(['checkout', 'promotions']);
  const hasDiscounts = pricing.discountTotal > 0;

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
          {formatPosCurrency(pricing.total)}
        </span>
      </div>

      <ul aria-labelledby="checkout-order-summary-title" className="mt-3 divide-y divide-border">
        {items.map((item) => {
          const line = getLinePricing(pricing, item.lineId);
          const unitPrice = item.quantity > 0 ? line.grossTotal / item.quantity : 0;
          return (
            <li
              key={item.lineId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight text-text">
                  {item.product.name}
                </p>
                <p className="mt-1 font-mono-tabular text-2xs text-text-dim">
                  {item.quantity} × {formatPosCurrency(unitPrice)}
                </p>
                {line.promotionNames.length > 0 ? (
                  <p className="mt-1 text-2xs font-medium text-success">
                    {line.promotionNames.join(" · ")} −{formatPosCurrency(line.discountAmount)}
                  </p>
                ) : null}
              </div>
              <p className="font-mono-tabular text-xs tracking-tight text-text">
                {line.discountAmount > 0 ? (
                  <span className="mr-1.5 text-text-dim line-through">{formatPosCurrency(line.grossTotal)}</span>
                ) : null}
                {formatPosCurrency(line.netTotal)}
              </p>
            </li>
          );
        })}
      </ul>

      {hasDiscounts ? (
        <dl className="mt-3 grid gap-1 border-t border-border-strong pt-2.5 text-xs">
          <div className="flex justify-between text-text-muted">
            <dt>{t('promotions:cart.subtotal')}</dt>
            <dd className="font-mono-tabular">{formatPosCurrency(pricing.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-success">
            <dt>{t('promotions:cart.discounts')}</dt>
            <dd className="font-mono-tabular">−{formatPosCurrency(pricing.discountTotal)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

export { CheckoutModalOrderSummary };
