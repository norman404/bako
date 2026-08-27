import { Flag } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { FeatureFlagsPanel } from "@/modules/settings/settings-window-entry";

export const FEATURES_SECTION: ModuleNavigationEntry = {
  id: "features",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.FEATURES,
  order: 10,
  labelKey: "settings:sections.features",
  descriptionKey: "settings:sections.featuresDesc",
  icon: Flag,
  Component: FeatureFlagsPanel,
};
