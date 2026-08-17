import { Printer } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleManifest,
} from "@/app/module-manifest";

import { PrinterSettingsPanel } from "./PrinterSettingsPanel";

export const printerManifest: ModuleManifest = {
  id: "printer",
  navigation: [
    {
      id: "printers",
      surface: NAVIGATION_SURFACE.SETTINGS,
      group: NAVIGATION_GROUP.PRINTING,
      order: 10,
      labelKey: "settings:printer.title",
      icon: Printer,
      Component: PrinterSettingsPanel,
      flagKey: "comandas_enabled",
    },
  ],
};
