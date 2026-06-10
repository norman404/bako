import { SearchX } from "lucide-react";

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
        <SearchX className="h-12 w-12 text-text-dim" aria-hidden="true" />
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-text-muted">
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
              className="group relative flex cursor-pointer flex-col items-stretch gap-2 rounded-card border border-border bg-surface-raised p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-0 active:bg-surface-sunken"
              style={color ? { borderLeftColor: color, borderLeftWidth: '3px' } : undefined}
            >
              <h3 className="text-base font-bold leading-tight text-text">
                {product.name}
              </h3>

              <span className="font-mono-tabular text-md font-semibold tracking-tight text-text transition-colors duration-200 group-hover:text-primary-strong">
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