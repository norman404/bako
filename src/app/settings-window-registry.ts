import { Flag, Globe, HardDrive } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { PRINTER_SETTINGS_WINDOW_ENTRY } from "@/modules/printer/settings-window-entry";
import {
  FeatureFlagsPanel,
  GeneralSettingsPanel,
  SystemSettingsPanel,
} from "@/modules/settings/settings-window-entry";
import { UPDATER_SETTINGS_WINDOW_ENTRY } from "@/modules/updater/settings-window-entry";

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
    id: "database",
    surface: NAVIGATION_SURFACE.SETTINGS,
    group: NAVIGATION_GROUP.SYSTEM,
    order: 10,
    labelKey: "settings:database.title",
    descriptionKey: "settings:database.description",
    icon: HardDrive,
    Component: SystemSettingsPanel,
  },
];

export const SETTINGS_WINDOW_ENTRIES: ModuleNavigationEntry[] = [
  ...STATIC_SETTINGS_WINDOW_ENTRIES,
  PRINTER_SETTINGS_WINDOW_ENTRY,
  UPDATER_SETTINGS_WINDOW_ENTRY,
];
