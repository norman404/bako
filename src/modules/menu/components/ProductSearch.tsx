import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useMenuStore } from "@/modules/menu/store/menu-store";

interface ProductSearchProps {
  className?: string;
}

function ProductSearch({ className }: ProductSearchProps) {
  const { t } = useTranslation("app");

  const productSearch = useMenuStore((state) => state.productSearch);
  const setProductSearch = useMenuStore((state) => state.setProductSearch);
  const clearProductSearch = useMenuStore((state) => state.clearProductSearch);

  return (
    <div className={className} data-testid="product-search">
      <div className="relative w-full">
        <SearchInput
          type="search"
          placeholder={t("search.placeholder")}
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="h-9 pr-9 w-full"
          aria-label={t("search.ariaLabel")}
        />
        {productSearch ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearProductSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-sharp text-ink-dim hover:text-ink"
            aria-label={t("search.clearAriaLabel")}
          >
            <X className="h-3 w-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export { ProductSearch };
