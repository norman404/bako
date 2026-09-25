import { LoaderCircle, Minus, Plus, Printer, ShoppingBasket, Trash2, X } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { calculateCartTotals, type CartItem } from "./cart-operations";
import { calculateItemUnitPrice, type SelectedModifier } from "@/modules/menu";
import { useFeatureFlagsStore } from "@/modules/feature-flags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPosCurrency } from "@/lib/currency";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DELIVERY_REFERENCE_MAX_LENGTH, ORDER_CHANNEL, isOrderChannel, type OrderChannel } from "./order-channel";
import { ORDER_NAME_MAX_LENGTH } from "./order-name";

interface CartProps {
  items: CartItem[];
  orderName: string;
  channel: OrderChannel;
  deliveryReference: string;
  isSubmitting?: boolean;
  onChannelChange: (channel: OrderChannel) => void;
  onDeliveryReferenceChange: (reference: string) => void;
  onOrderNameChange: (orderName: string) => void;
  onIncreaseQuantity: (lineId: string) => void;
  onDecreaseQuantity: (lineId: string) => void;
  onRemoveItem: (lineId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

function Cart({
  items,
  orderName,
  channel,
  deliveryReference,
  isSubmitting = false,
  onChannelChange,
  onDeliveryReferenceChange,
  onOrderNameChange,
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
  const orderNameInputId = useId();
  const referenceInputId = useId();
  const isDelivery = channel !== ORDER_CHANNEL.LOCAL;

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-surface-raised text-text">
      <fieldset disabled={isSubmitting} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">{t("cart.eyebrow")}</p>
              <h2 className="font-display mt-1 text-xl leading-tight text-primary-strong">
                <span className="text-text-muted">{t("cart.headerLa")}</span>{" "}
                {t("cart.headerCuenta")}
              </h2>
            </div>
            {!isEmpty ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClearCart}
                className="h-11 w-11 rounded-card text-text-dim hover:text-danger"
                aria-label={t("cart.clearAriaLabel")}
                title={t("cart.clearAriaLabel")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-2">
            <span className="text-sm font-medium text-text-muted">{t("delivery.origin")}</span>
            <SegmentedControl
              compact
              ariaLabel={t("delivery.origin")}
              options={Object.values(ORDER_CHANNEL).map((value) => ({ value, label: t(`channels.${value}`) }))}
              activeValue={channel}
              onSelect={(value) => { if (isOrderChannel(value)) onChannelChange(value); }}
            />
          </div>
          <div className={isDelivery ? "mt-4 grid grid-cols-2 gap-3" : "mt-4 grid gap-2"}>
            {isDelivery ? (
              <div className="grid min-w-0 gap-2">
                <Label htmlFor={referenceInputId} className="text-sm normal-case tracking-normal text-text-muted">
                  {t("delivery.referenceShort")}
                </Label>
                <Input
                  id={referenceInputId}
                  value={deliveryReference}
                  maxLength={DELIVERY_REFERENCE_MAX_LENGTH}
                  autoComplete="off"
                  placeholder={t("cart.orderNamePlaceholder")}
                  aria-label={t("delivery.reference")}
                  onChange={(event) => onDeliveryReferenceChange(event.currentTarget.value)}
                  className="h-10 min-w-0"
                />
              </div>
            ) : null}
            <div className="grid min-w-0 gap-2">
              <Label htmlFor={orderNameInputId} className="text-sm normal-case tracking-normal text-text-muted">
                {t("cart.orderNameLabel")}
              </Label>
              <Input
                id={orderNameInputId}
                value={orderName}
                maxLength={ORDER_NAME_MAX_LENGTH}
                autoComplete="off"
                placeholder={t("cart.orderNamePlaceholder")}
                onChange={(event) => onOrderNameChange(event.currentTarget.value)}
                className="h-10 min-w-0"
              />
            </div>
          </div>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
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
          <footer className="shrink-0 border-t border-border bg-surface-raised px-5 py-4">
            <div className="flex items-center justify-between gap-3 text-xs text-text-dim">
              <span>{t("cart.productsLabel")}</span>
              <span className="font-mono-tabular">{String(totalItems).padStart(2, "0")}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm text-text-muted">
                {isDelivery ? t("delivery.catalogReference") : t("cart.totalLabel")}
              </span>
              <span className={isDelivery ? "font-mono-tabular shrink-0 text-lg font-semibold text-text-muted" : "font-mono-tabular shrink-0 text-display font-bold leading-tight text-text"}>
                {formatPosCurrency(totals.total)}
              </span>
            </div>
            {isDelivery ? <p className="mt-2 text-xs leading-5 text-text-dim">{t("delivery.saveHint")}</p> : null}
            <Button
              variant="cta"
              size="large"
              onClick={onCheckout}
              aria-label={isDelivery ? t("delivery.saveAndPrintAriaLabel") : undefined}
              aria-busy={isSubmitting}
              className="mt-4 h-12 w-full gap-2 rounded-card px-4 text-sm font-semibold"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : isDelivery ? <Printer className="h-4 w-4" aria-hidden="true" /> : null}
              <span className="whitespace-normal leading-5">{isSubmitting ? t("delivery.saving") : isDelivery ? t("delivery.saveAndPrint") : t("cart.payButton")}</span>
            </Button>
          </footer>
        ) : null}
      </fieldset>
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
