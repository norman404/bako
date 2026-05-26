import { Minus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { calculateCartTotals, type CartItem } from "@/modules/order/domain/cart";
import { Button } from "@/components/ui/Button";
import { formatPosCurrency } from "@/lib/currency";

interface CartProps {
  items: CartItem[];
  onIncreaseQuantity: (productId: string) => void;
  onDecreaseQuantity: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

function Cart({
  items,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: CartProps) {
  const { t } = useTranslation('order');
  const totals = calculateCartTotals(items);
  const isEmpty = items.length === 0;
  const totalItems = totals.itemsCount;

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-obsidian-raised text-ink">
      <header className="relative px-7 pb-5 pt-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">{t('cart.eyebrow')}</p>
            <h2 className="mt-2 text-[30px] leading-none tracking-[-0.02em] text-ink">
              <span className="font-medium text-ink-muted">{t('cart.headerLa')}</span>{" "}
              <span className="font-display text-champagne">{t('cart.headerCuenta')}</span>
            </h2>
          </div>
          {!isEmpty ? (
            <Button
              variant="ghost"
              size="small"
              onClick={onClearCart}
              className="rounded-sharp border border-hairline text-ink-dim hover:border-danger/40 hover:text-danger"
              aria-label={t('cart.clearAriaLabel')}
            >
              <Trash2 className="h-3 w-3" />
              {t('cart.clearButton')}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-7 border-t border-hairline" />

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-5">
        {isEmpty ? (
          <div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
            <span className="font-display text-6xl leading-none text-ink-dim">00</span>
            <p className="mt-5 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              {t('cart.emptyTitle')}
            </p>
            <p className="mt-2 eyebrow">{t('cart.emptyHint')}</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {items.map((item) => (
              <li key={item.product.id} className="group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-ink">
                      {item.product.name}
                    </h4>
                    <p className="mt-1 font-mono-tabular text-[11px] text-ink-dim">
                      × {formatPosCurrency(item.product.price)}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-[15px] tracking-tight text-ink">
                    {formatPosCurrency(item.product.price * item.quantity)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-sharp border border-hairline-strong">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDecreaseQuantity(item.product.id)}
                      className="h-10 w-10 text-ink-muted hover:bg-obsidian-elevated hover:text-ink"
                      aria-label={t('cart.decreaseAriaLabel', { productName: item.product.name })}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="font-mono-tabular flex h-10 min-w-10 items-center justify-center border-x border-hairline-strong bg-champagne/10 px-2 text-center text-[13px] font-medium text-champagne">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onIncreaseQuantity(item.product.id)}
                      className="h-10 w-10 text-ink-muted hover:bg-obsidian-elevated hover:text-ink"
                      aria-label={t('cart.increaseAriaLabel', { productName: item.product.name })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.product.id)}
                    className="h-8 w-8 text-ink-dim opacity-40 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t('cart.removeAriaLabel', { productName: item.product.name })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isEmpty ? (
        <footer className="border-t border-hairline bg-obsidian-raised px-7 pb-7 pt-5">
          <dl className="space-y-2 text-[12px]">
            <div className="flex items-baseline">
              <dt className="eyebrow">{t('cart.productsLabel')}</dt>
              <span className="dotted-leader" />
              <dd className="font-mono-tabular text-ink-muted">
                {String(totalItems).padStart(2, "0")}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-hairline-strong pt-5">
            <span className="text-[12px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              {t('cart.totalLabel')}
            </span>
            <span className="font-mono-tabular text-[32px] font-bold leading-none tracking-[-0.02em] text-champagne">
              {formatPosCurrency(totals.total)}
            </span>
          </div>

          <Button
            size="large"
            onClick={onCheckout}
            className="pay-cta mt-6 h-[72px] w-full justify-between px-5 text-obsidian"
          >
            <span className="text-[12px] font-black uppercase tracking-[0.28em]">{t('cart.payButton')}</span>
            <span className="font-mono-tabular text-[18px] font-bold tracking-tight">
              {formatPosCurrency(totals.total)}
            </span>
          </Button>
        </footer>
      ) : null}
    </aside>
  );
}

export { Cart };
