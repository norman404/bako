import { Flag, Globe, HardDrive } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { SystemSettingsPanel } from "@/app/system-settings-panel";
import { PRINTER_SETTINGS_WINDOW_ENTRY } from "@/modules/printer/settings-window-entry";
import {
  FeatureFlagsPanel,
  GeneralSettingsPanel,
} from "@/modules/settings/settings-window-entry";

const STATIC_SETTINGS_WINDOW_ENTRIES: ModuleNavigationEntry[] = [
  {
    id: "general",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.GENERAL,
    order: 10,
    labelKey: "settings:sections.general",
    descriptionKey: "settings:sections.generalDesc",
    icon: Globe,
    Component: GeneralSettingsPanel,
  },
  {
    id: "features",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.FEATURES,
    order: 10,
    labelKey: "settings:sections.features",
    descriptionKey: "settings:sections.featuresDesc",
    icon: Flag,
    Component: FeatureFlagsPanel,
  },
  {
    id: "system",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.SYSTEM,
    order: 10,
    labelKey: "settings:sections.system",
    descriptionKey: "settings:sections.systemDesc",
    icon: HardDrive,
    Component: SystemSettingsPanel,
  },
];

export const SETTINGS_WINDOW_ENTRIES: ModuleNavigationEntry[] = [
  ...STATIC_SETTINGS_WINDOW_ENTRIES,
  PRINTER_SETTINGS_WINDOW_ENTRY,
];
