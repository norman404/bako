import { LayoutGrid, Package, SlidersHorizontal, UtensilsCrossed } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleManifest,
} from "@/app/module-manifest";

import { CategorySettingsPanel } from "./components/CategorySettingsPanel";
import { MenuSettingsPanel } from "./components/MenuSettingsPanel";
import { ModifierGroupSettingsPanel } from "./components/ModifierGroupSettingsPanel";
import { ProductSettingsPanel } from "./components/ProductSettingsPanel";

export const menuManifest: ModuleManifest = {
  id: "menu",
  navigation: [
    {
      id: "products",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.CATALOG,
      order: 10,
      labelKey: "settings:sections.products",
      icon: Package,
      Component: ProductSettingsPanel,
    },
    {
      id: "categories",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.CATALOG,
      order: 20,
      labelKey: "settings:sections.categories",
      icon: LayoutGrid,
      Component: CategorySettingsPanel,
      flagKey: "categories_enabled",
    },
    {
      id: "menus",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.CATALOG,
      order: 30,
      labelKey: "settings:sections.menus",
      icon: UtensilsCrossed,
      Component: MenuSettingsPanel,
      flagKey: "multiple_menus_enabled",
    },
    {
      id: "modifier-groups",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.CATALOG,
      order: 40,
      labelKey: "settings:modifierGroups.title",
      icon: SlidersHorizontal,
      Component: ModifierGroupSettingsPanel,
      flagKey: "modifier_groups_enabled",
    },
  ],
};
