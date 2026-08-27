import { Globe } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { GeneralSettingsPanel } from "@/modules/settings/settings-window-entry";

export const GENERAL_SECTION: ModuleNavigationEntry = {
  id: "general",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.GENERAL,
  order: 10,
  labelKey: "settings:sections.general",
  descriptionKey: "settings:sections.generalDesc",
  icon: Globe,
  Component: GeneralSettingsPanel,
};
