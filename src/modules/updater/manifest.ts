import type { ModuleManifest } from "@/app/module-manifest";

import { UPDATER_SETTINGS_WINDOW_ENTRY } from "./settings-window-entry";

export const updaterManifest: ModuleManifest = {
  id: "updater",
  navigation: [UPDATER_SETTINGS_WINDOW_ENTRY],
};
