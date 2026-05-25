import { Minus, Plus, Trash2, X } from "lucide-react";

import { calculateCartTotals, type CartItem } from "@/features/order/domain/cart";
import { Button } from "@/shared/components/ui/button";
import { formatPosCurrency } from "@/shared/lib/currency";

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
  const totals = calculateCartTotals(items);
  const isEmpty = items.length === 0;
  const totalItems = totals.itemsCount;

  return (
    <aside className="flex h-full flex-col overflow-hidden bg-obsidian-raised text-ink">
      <header className="relative px-7 pb-5 pt-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Comanda</p>
            <h2 className="mt-2 text-[30px] leading-none tracking-[-0.02em] text-ink">
              <span className="font-medium text-ink-muted">La</span>{" "}
              <span className="font-display text-champagne">Cuenta</span>
            </h2>
          </div>
          {!isEmpty ? (
            <button
              type="button"
              onClick={onClearCart}
              className="flex items-center gap-1.5 rounded-sharp border border-hairline px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-ink-dim transition-colors duration-150 hover:border-danger/40 hover:text-danger"
              aria-label="Vaciar comanda"
            >
              <Trash2 className="h-3 w-3" />
              Vaciar
            </button>
          ) : null}
        </div>
      </header>

      <div className="mx-7 border-t border-hairline" />

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 py-5">
        {isEmpty ? (
          <div className="flex h-full min-h-44 flex-col items-center justify-center text-center">
            <span className="font-display text-6xl leading-none text-ink-dim">00</span>
            <p className="mt-5 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              Aún no hay productos
            </p>
            <p className="mt-2 eyebrow">Seleccioná del menú</p>
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
                    <button
                      type="button"
                      onClick={() => onDecreaseQuantity(item.product.id)}
                      className="flex h-10 w-10 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-obsidian-elevated hover:text-ink"
                      aria-label={`Disminuir ${item.product.name}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono-tabular flex h-10 min-w-10 items-center justify-center border-x border-hairline-strong bg-champagne/10 px-2 text-center text-[13px] font-medium text-champagne">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncreaseQuantity(item.product.id)}
                      className="flex h-10 w-10 items-center justify-center text-ink-muted transition-colors duration-150 hover:bg-obsidian-elevated hover:text-ink"
                      aria-label={`Aumentar ${item.product.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product.id)}
                    className="flex h-8 w-8 items-center justify-center text-ink-dim opacity-0 transition-opacity duration-150 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Eliminar ${item.product.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
              <dt className="eyebrow">Productos</dt>
              <span className="dotted-leader" />
              <dd className="font-mono-tabular text-ink-muted">
                {String(totalItems).padStart(2, "0")}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-hairline-strong pt-5">
            <span className="text-[12px] font-medium uppercase tracking-[0.22em] text-ink-muted">
              Total
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
            <span className="text-[12px] font-black uppercase tracking-[0.28em]">Pagar</span>
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
