import type { Category } from "@/modules/menu/domain/category";
import { filterProductsByCategory } from "@/modules/menu/domain/product-filters";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import type { Product } from "@/modules/menu/domain/product";
import { formatPosCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategoryId: string | "all";
  onAddToCart: (product: Product) => void;
}

function ProductGrid({ products, categories, activeCategoryId, onAddToCart }: ProductGridProps) {
  const { t } = useTranslation('menu');
  const visibleProducts = filterProductsByCategory(sortProductsForMenu(products, categories), activeCategoryId);

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  if (visibleProducts.length === 0) {
    return (
      <section className="relative flex min-h-[50vh] flex-col items-center justify-center py-12">
        <span className="font-display text-6xl leading-none text-ink-dim">{t('productGrid.emptySymbol')}</span>
        <p className="mt-6 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-muted">
          {t('productGrid.emptyTitle')}
        </p>
        <p className="mt-2 eyebrow">{t('productGrid.emptyHint')}</p>
      </section>
    );
  }

  return (
    <section className="relative">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleProducts.map((product) => {
          const category = categoryById.get(product.categoryId);
          const color = category?.color;

          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              aria-label={t('productGrid.addAriaLabel', { productName: product.name })}
              className="group relative flex flex-col items-stretch gap-2 rounded-card border border-hairline bg-obsidian-raised p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:bg-obsidian-elevated active:bg-obsidian"
              style={color ? { borderLeftColor: color, borderLeftWidth: '3px' } : undefined}
            >
              <h3 className="font-display text-[16px] leading-tight tracking-tight text-ink">
                {product.name}
              </h3>

              <span className="font-mono-tabular text-[14px] tracking-tight text-ink-dim transition-colors group-hover:text-champagne">
                {formatPosCurrency(product.price)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export { ProductGrid };