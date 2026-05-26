import type { Category } from "@/modules/menu/domain/category";
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
  const hasColor = !!color;

  const dynamicStyles = hasColor
    ? {
        backgroundColor: `${color}18`, // ~10% opacity
        borderColor: active ? color : `${color}40`,
        color: active ? color : undefined,
      }
    : {};

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "relative shrink-0 select-none rounded-card border px-5 py-3 text-left transition-all duration-200",
        "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60",
        active
          ? "font-bold"
          : "font-medium",
        hasColor
          ? ""
          : cn(
              active
                ? "border-champagne/40 bg-obsidian-elevated text-ink"
                : "border-hairline bg-obsidian-raised text-ink-dim hover:border-hairline-strong hover:text-ink-muted"
            ),
      )}
      style={dynamicStyles}
    >
      <span className="flex items-baseline gap-2">
        <span className="whitespace-nowrap text-[12px] uppercase tracking-[0.14em]">
          {label}
        </span>
        <span
          className={cn(
            "font-mono-tabular text-[10px] tracking-wider",
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