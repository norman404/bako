import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { Download } from "lucide-react";

import { UpdateSettingsPanel } from "./UpdateSettingsPanel";

export const UPDATER_SETTINGS_WINDOW_ENTRY: ModuleNavigationEntry = {
  id: "updater",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.SYSTEM,
  order: 20,
  labelKey: "settings:sections.updater",
  descriptionKey: "settings:sections.updaterDesc",
  icon: Download,
  Component: UpdateSettingsPanel,
};
