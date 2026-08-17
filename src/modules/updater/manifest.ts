import { Download } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleManifest,
} from "@/app/module-manifest";

import { UpdateSettingsPanel } from "./UpdateSettingsPanel";

export const updaterManifest: ModuleManifest = {
  id: "updater",
  navigation: [
    {
      id: "updater",
      surface: NAVIGATION_SURFACE.SETTINGS,
      group: NAVIGATION_GROUP.SYSTEM,
      order: 20,
      labelKey: "settings:sections.updater",
      descriptionKey: "settings:sections.updaterDesc",
      icon: Download,
      Component: UpdateSettingsPanel,
    },
  ],
};
