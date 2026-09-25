import { BadgePercent } from "lucide-react";

import { NAVIGATION_GROUP, NAVIGATION_SURFACE, type ModuleManifest } from "@/app/module-manifest";

import { PromotionSettingsPanel } from "./PromotionSettingsPanel";

export const promotionsManifest: ModuleManifest = {
  id: "promotions",
  navigation: [
    {
      id: "promotions",
      surface: NAVIGATION_SURFACE.ADMIN,
      group: NAVIGATION_GROUP.CATALOG,
      order: 50,
      labelKey: "promotions:title",
      icon: BadgePercent,
      Component: PromotionSettingsPanel,
      flagKey: "promotions_enabled",
    },
  ],
};
