import { LayoutGrid, Package, UtensilsCrossed } from "lucide-react";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { CategorySettingsPanel } from "./components/admin/CategorySettingsPanel";
import { ProductSettingsPanel } from "./components/admin/ProductSettingsPanel";
import { MenuSettingsPanel } from "./components/admin/MenuSettingsPanel";

export const productsManifest: ModuleManifest = {
  id: "products",
  settingsPanel: ProductSettingsPanel,
  settingsLabel: "Productos",
  settingsIcon: Package,
};

export const categoriesManifest: ModuleManifest = {
  id: "categories",
  flagKey: "categories_enabled",
  settingsPanel: CategorySettingsPanel,
  settingsLabel: "Categorías",
  settingsIcon: LayoutGrid,
};

export const menusManifest: ModuleManifest = {
  id: "menus",
  flagKey: "multiple_menus_enabled",
  settingsPanel: MenuSettingsPanel,
  settingsLabel: "Menús",
  settingsIcon: UtensilsCrossed,
};
