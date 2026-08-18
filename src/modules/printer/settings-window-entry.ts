import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { Printer } from "lucide-react";

import { PrinterSettingsPanel } from "./PrinterSettingsPanel";

export const PRINTER_SETTINGS_WINDOW_ENTRY: ModuleNavigationEntry = {
  id: "printers",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.PRINTING,
  order: 10,
  labelKey: "settings:printer.title",
  icon: Printer,
  Component: PrinterSettingsPanel,
  flagKey: "comandas_enabled",
};
