import type { Category } from "@/modules/menu/domain/category";
import { filterProductsByCategory } from "@/modules/menu/domain/product-filters";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import type { Product } from "@/modules/menu/domain/product";
import { formatPosCurrency } from "@/lib/currency";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategoryId: string | "all";
  onAddToCart: (product: Product) => void;
}

function ProductGrid({ products, categories, activeCategoryId, onAddToCart }: ProductGridProps) {
  const visibleProducts = filterProductsByCategory(sortProductsForMenu(products, categories), activeCategoryId);

  if (visibleProducts.length === 0) {
    return (
      <section className="relative flex min-h-[50vh] flex-col items-center justify-center py-12">
        <span className="font-display text-6xl leading-none text-ink-dim">∅</span>
        <p className="mt-6 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-muted">
          La carta está vacía en esta sección
        </p>
        <p className="mt-2 eyebrow">Probá otra categoría</p>
      </section>
    );
  }

  return (
    <section className="relative">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleProducts.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onAddToCart(product)}
            aria-label={`Agregar ${product.name}`}
            className={[
              "group relative flex min-h-[140px] flex-col items-stretch gap-5 text-left cursor-pointer touch-manipulation",
              "rounded-card border border-hairline bg-obsidian-raised p-6",
              "transition-[transform,border-color,background-color] duration-150 ease-out",
              "hover:-translate-y-0.5 hover:border-hairline-strong hover:bg-obsidian-elevated",
              "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/60",
              "active:bg-obsidian",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sharp border border-hairline bg-obsidian text-2xl leading-none">
                <span>{product.image}</span>
              </div>
              <span className="font-mono-tabular text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                {product.prepTimeMinutes}m
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-end gap-4">
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-[22px] leading-tight tracking-tight text-ink">
                  {product.name}
                </h3>
                {product.description ? (
                  <p className="text-[12px] leading-snug text-ink-dim line-clamp-2">
                    {product.description}
                  </p>
                ) : null}
              </div>

              <div className="flex items-baseline justify-between gap-2 border-t border-hairline pt-4">
                <span className="eyebrow">Precio</span>
                <span className="font-mono-tabular text-[18px] tracking-tight text-ink transition-colors group-hover:text-champagne">
                  {formatPosCurrency(product.price)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export { ProductGrid };
