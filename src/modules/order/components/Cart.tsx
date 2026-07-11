import { Minus, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { calculateCartTotals, type CartItem } from "@/modules/order/domain/cart";
import { calculateItemUnitPrice } from "@/modules/menu/lib/modifier-price";
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { Button } from "@/components/ui/Button";
import { formatPosCurrency } from "@/lib/currency";

interface CartProps {
  items: CartItem[];
  onIncreaseQuantity: (lineId: string) => void;
  onDecreaseQuantity: (lineId: string) => void;
  onRemoveItem: (lineId: string) => void;
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
  const { flags } = useFeatureFlagsStore();
  const modifierGroupsEnabled = flags.modifier_groups_enabled ?? false;
  const totals = calculateCartTotals(items);
  const isEmpty = items.length === 0;
  const totalItems = totals.itemsCount;

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-surface-raised text-text">
      <header className="relative px-7 pb-5 pt-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">{t('cart.eyebrow')}</p>
            <h2 className="font-display mt-2 text-xl leading-none text-primary-strong">
              <span className="text-text-muted">{t('cart.headerLa')}</span>{" "}
              <span>{t('cart.headerCuenta')}</span>
            </h2>
          </div>
          {!isEmpty ? (
            <Button
              variant="ghost"
              size="small"
              onClick={onClearCart}
              className="rounded-sharp border border-border text-text-dim hover:border-danger/40 hover:text-danger"
              aria-label={t('cart.clearAriaLabel')}
            >
              <Trash2 className="h-3 w-3" />
              {t('cart.clearButton')}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-7 border-t border-border" />

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-5">
        {isEmpty ? (
          <div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
            <ShoppingBasket className="h-14 w-14 text-text-dim" aria-hidden="true" />
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
              {t('cart.emptyTitle')}
            </p>
            <p className="mt-2 eyebrow">{t('cart.emptyHint')}</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {items.map((item) => {
              const unitPrice = calculateItemUnitPrice(item.product, item.selectedModifiers);
              const hasModifiers = modifierGroupsEnabled && item.selectedModifiers.length > 0;

              return (
              <li key={item.lineId} className="group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-md font-bold leading-tight tracking-[-0.01em] text-text">
                      {item.product.name}
                    </h4>
                    <p className="mt-1 font-mono-tabular text-2xs text-text-dim">
                      × {formatPosCurrency(unitPrice)}
                    </p>
                    {hasModifiers && (
                      <ModifierList
                        modifiers={item.selectedModifiers}
                        quantity={item.quantity}
                      />
                    )}
                  </div>
                  <span className="font-mono-tabular text-md tracking-tight text-text">
                    {formatPosCurrency(unitPrice * item.quantity)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-sharp border border-border-strong">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDecreaseQuantity(item.lineId)}
                      className="h-11 w-11 text-text-muted hover:bg-surface-sunken hover:text-text"
                      aria-label={t('cart.decreaseAriaLabel', { productName: item.product.name })}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-mono-tabular flex h-11 min-w-11 items-center justify-center border-x border-border-strong bg-primary/10 px-2 text-center text-sm font-semibold text-primary-strong">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onIncreaseQuantity(item.lineId)}
                      className="h-11 w-11 text-text-muted hover:bg-surface-sunken hover:text-text"
                      aria-label={t('cart.increaseAriaLabel', { productName: item.product.name })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.lineId)}
                    className="h-11 w-11 text-text-dim opacity-40 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={t('cart.removeAriaLabel', { productName: item.product.name })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isEmpty ? (
        <footer className="border-t border-border bg-surface-raised px-7 pb-7 pt-5">
          <dl className="space-y-2 text-xs">
            <div className="flex items-baseline">
              <dt className="eyebrow">{t('cart.productsLabel')}</dt>
              <span className="dotted-leader" />
              <dd className="font-mono-tabular text-text-muted">
                {String(totalItems).padStart(2, "0")}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-border-strong pt-5">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-text-muted">
              {t('cart.totalLabel')}
            </span>
            <span className="font-mono-tabular text-display font-bold leading-none tracking-[-0.02em] text-text">
              {formatPosCurrency(totals.total)}
            </span>
          </div>

          <Button
            variant="cta"
            size="large"
            onClick={onCheckout}
            className="mt-6 h-[72px] w-full justify-between px-5"
          >
            <span className="text-xs font-black uppercase tracking-[0.28em]">{t('cart.payButton')}</span>
            <span className="font-mono-tabular text-lg font-bold tracking-tight">
              {formatPosCurrency(totals.total)}
            </span>
          </Button>
        </footer>
      ) : null}
    </aside>
  );
}

interface ModifierListProps {
  modifiers: SelectedModifier[];
  quantity: number;
}

/**
 * Renders the modifier chips for a cart item, grouped by `groupName` so
 * the cashier can see which group each chip belongs to.
 */
function ModifierList({ modifiers, quantity }: ModifierListProps) {
  // Group modifiers by groupName, preserving first-seen order.
  const grouped = new Map<string, SelectedModifier[]>();
  for (const modifier of modifiers) {
    const key = modifier.groupName ?? "_";
    const list = grouped.get(key) ?? [];
    list.push(modifier);
    grouped.set(key, list);
  }

  return (
    <ul data-testid="cart-item-modifiers" className="mt-1.5 space-y-1">
      {Array.from(grouped.entries()).map(([groupName, mods], groupIndex) => (
        <li
          key={groupName === "_" ? `orphan-${groupIndex}` : `${groupName}-${groupIndex}`}
          data-testid="modifier-group"
          className="flex flex-wrap items-center gap-1"
        >
          {groupName !== "_" ? (
            <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-text-dim">
              {groupName}:
            </span>
          ) : null}
          {mods.map((modifier, index) => {
            const label = modifier.optionName || modifier.textValue || "";
            const value = groupName === "_"
              ? label
              : `${groupName}: ${label}`;
            return (
              <span
                key={`${modifier.groupId}-${index}`}
                data-testid="modifier-chip"
                className="inline-flex items-center gap-1 rounded-sharp bg-primary/10 px-1.5 py-0.5 text-2xs font-medium text-primary"
              >
                {value}
                {quantity > 1 ? (
                  <span className="font-mono-tabular text-text-dim">×{quantity}</span>
                ) : null}
              </span>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

export { Cart };
