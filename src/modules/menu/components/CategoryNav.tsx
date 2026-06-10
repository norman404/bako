import type { Category } from "@/modules/menu/domain/category";
import { categoryAccent } from "@/lib/color";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation('menu');
  const totalCount = Object.values(productCountByCategory ?? {}).reduce((sum, n) => sum + n, 0);

  return (
    <nav
      aria-label={t('categoryNav.ariaLabel')}
      className="scrollbar-none flex items-center gap-3 overflow-x-auto pb-1"
    >
      <CategoryItem
        id="all"
        label={t('categoryNav.all')}
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
          color={category.color}
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
  color?: string | null;
}

function CategoryItem({ id, label, count, active, onSelect, color }: CategoryItemProps) {
  const accent = color ? categoryAccent(color) : null;

  const dynamicStyles = accent
    ? {
        backgroundColor: accent.bg,
        borderColor: active && color ? color : accent.border,
        color: accent.text,
      }
    : undefined;

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "relative shrink-0 cursor-pointer select-none rounded-card border px-5 py-3 text-left transition-all duration-200",
        "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        active
          ? "font-bold"
          : "font-medium",
        accent
          ? ""
          : cn(
              active
                ? "border-primary bg-surface-sunken text-text"
                : "border-border bg-surface-raised text-text-muted hover:border-border-strong hover:text-text"
            ),
      )}
      style={dynamicStyles}
    >
      <span className="flex items-baseline gap-2">
        <span className="whitespace-nowrap text-xs uppercase tracking-[0.14em]">
          {label}
        </span>
        <span
          className={cn(
            "font-mono-tabular text-2xs tracking-wider",
            active ? "opacity-100" : "opacity-60",
          )}
        >
          {String(count).padStart(2, "0")}
        </span>
      </span>
    </button>
  );
}

export { CategoryNav };