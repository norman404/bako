import type { Category } from "@/modules/menu/domain/category";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string | "all";
  onCategoryChange: (categoryId: string | "all") => void;
  productCountByCategory?: Record<string, number>;
}

function CategoryNav({
  categories,
  activeCategoryId,
  onCategoryChange,
  productCountByCategory,
}: CategoryNavProps) {
  const totalCount = Object.values(productCountByCategory ?? {}).reduce((sum, n) => sum + n, 0);

  return (
    <nav
      aria-label="Filtrar productos por categoría"
      className="scrollbar-none flex items-center gap-1 overflow-x-auto"
    >
      <CategoryItem
        id="all"
        label="Todo"
        count={totalCount}
        active={activeCategoryId === "all"}
        onSelect={onCategoryChange}
      />
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          id={category.id}
          label={category.name}
          count={productCountByCategory?.[category.id] ?? 0}
          active={activeCategoryId === category.id}
          onSelect={onCategoryChange}
        />
      ))}
    </nav>
  );
}

interface CategoryItemProps {
  id: string | "all";
  label: string;
  count: number;
  active: boolean;
  onSelect: (categoryId: string | "all") => void;
}

function CategoryItem({ id, label, count, active, onSelect }: CategoryItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "group relative shrink-0 px-5 py-5 text-left transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/60",
      )}
    >
      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            "whitespace-nowrap transition-colors duration-150",
            active
              ? "text-[13px] font-bold uppercase tracking-[0.14em] text-ink"
              : "text-[11px] font-medium uppercase tracking-[0.18em] text-ink-dim group-hover:text-ink-muted",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-mono-tabular text-[10px] tracking-wider transition-colors",
            active ? "text-champagne" : "text-ink-dim",
          )}
        >
          {String(count).padStart(2, "0")}
        </span>
      </span>
      <span
        className={cn(
          "absolute -bottom-px left-5 right-5 h-px origin-left transition-transform duration-300 ease-out",
          active ? "scale-x-100 bg-champagne" : "scale-x-0 bg-hairline-strong group-hover:scale-x-100",
        )}
      />
    </button>
  );
}

export { CategoryNav };
