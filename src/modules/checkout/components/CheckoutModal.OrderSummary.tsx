import type { CartItem, CartTotals } from "@/modules/order/domain/cart";
import { formatPosCurrency } from "@/lib/currency";

interface CheckoutModalOrderSummaryProps {
  items: CartItem[];
  totals: CartTotals;
}

function CheckoutModalOrderSummary({
  items,
  totals,
}: CheckoutModalOrderSummaryProps) {
  return (
    <section className="rounded-card border border-hairline bg-white/[0.015] px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-2.5">
        <h3 className="text-[15px] font-medium text-ink">Cuenta</h3>
        <span className="font-mono-tabular text-[20px] font-semibold tracking-[-0.02em] text-champagne sm:text-[22px]">
          {formatPosCurrency(totals.total)}
        </span>
      </div>

      <div className="scrollbar-thin mt-3 max-h-44 space-y-2 overflow-y-auto pr-1 sm:max-h-48">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t border-hairline pt-2.5 first:border-t-0 first:pt-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-tight tracking-[-0.01em] text-ink">
                {item.product.name}
              </p>
              <p className="mt-1 font-mono-tabular text-[10px] text-ink-dim">
                {item.quantity} × {formatPosCurrency(item.product.price)}
              </p>
            </div>
            <p className="font-mono-tabular text-[12px] tracking-tight text-ink">
              {formatPosCurrency(item.product.price * item.quantity)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export { CheckoutModalOrderSummary };
