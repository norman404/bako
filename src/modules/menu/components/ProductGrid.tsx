import { SearchX, SlidersHorizontal } from "lucide-react";

import type { Category } from "@/modules/menu/domain/category";
import type { ModifierGroup } from "@/modules/menu/domain/modifier-group";
import { filterProductsByCategory } from "@/modules/menu/domain/product-filters";
import { sortProductsForMenu } from "@/modules/menu/domain/product-order";
import type { Product } from "@/modules/menu/domain/product";
import { useFeatureFlagsStore } from "@/modules/feature-flags/store/feature-flags-store";
import { formatPosCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategoryId: string | "all";
  onAddToCart: (product: Product) => void;
  productModifierGroups?: Record<string, ModifierGroup[]>;
}

function ProductGrid({ products, categories, activeCategoryId, onAddToCart, productModifierGroups }: ProductGridProps) {
  const { t } = useTranslation('menu');
  const { flags } = useFeatureFlagsStore();
  const modifierGroupsEnabled = flags.modifier_groups_enabled ?? false;
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
          const groups = productModifierGroups?.[product.id] ?? [];
          const hasModifiers = modifierGroupsEnabled && groups.length > 0;

          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              aria-label={t('productGrid.addAriaLabel', { productName: product.name })}
              className="group relative flex cursor-pointer flex-col items-stretch gap-2 rounded-card border border-border bg-surface-raised p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-0 active:bg-surface-sunken"
              style={color ? { borderLeftColor: color, borderLeftWidth: '3px' } : undefined}
            >
              {hasModifiers && (
                <span
                  data-testid={`modifier-badge-${product.id}`}
                  data-group-count={groups.length > 1 ? String(groups.length) : undefined}
                  className="absolute right-2 top-2 inline-flex h-6 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 text-2xs font-semibold text-primary"
                  aria-label={t('productGrid.modifierBadge', { defaultValue: 'Personalizable' })}
                >
                  <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
                  {groups.length > 1 ? (
                    <span className="font-mono-tabular">{groups.length}</span>
                  ) : null}
                </span>
              )}

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