import type { ModuleManifest } from "@/app/module-manifest";

import { PRINTER_SETTINGS_WINDOW_ENTRY } from "./settings-window-entry";

export const printerManifest: ModuleManifest = {
  id: "printer",
  navigation: [PRINTER_SETTINGS_WINDOW_ENTRY],
};
