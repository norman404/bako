import { useTranslation } from "react-i18next";
import type { Menu } from "@/modules/menu/domain/menu";
import { cn } from "@/lib/utils";

interface MenuSelectorProps {
  menus: Menu[];
  selectedMenuId: string | null;
  onSelect: (menuId: string) => void;
}

function MenuSelector({ menus, selectedMenuId, onSelect }: MenuSelectorProps) {
  const { t } = useTranslation("menu");

  // If no menus or only one menu, don't render a selector
  if (menus.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={t("menuSelector.ariaLabel")}
      className="scrollbar-none flex items-center gap-3 overflow-x-auto pb-1"
    >
      {menus.map((menu) => (
        <button
          key={menu.id}
          onClick={() => onSelect(menu.id)}
          className={cn(
            "relative shrink-0 select-none rounded-card border px-5 py-3 text-left transition-all duration-200",
            "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60",
            selectedMenuId === menu.id
              ? "border-champagne/40 bg-obsidian-elevated font-bold text-ink"
              : "border-hairline bg-obsidian-raised font-medium text-ink-dim hover:border-hairline-strong hover:text-ink-muted"
          )}
        >
          <span className="flex items-baseline gap-2">
            <span className="whitespace-nowrap text-[12px] uppercase tracking-[0.14em]">
              {menu.name}
            </span>
            {menu.isDefault && (
              <span
                className={cn(
                  "font-mono-tabular text-[10px] tracking-wider",
                  selectedMenuId === menu.id ? "opacity-100" : "opacity-60"
                )}
              >
                {t("menuSelector.default")}
              </span>
            )}
          </span>
        </button>
      ))}
    </nav>
  );
}

export { MenuSelector };
