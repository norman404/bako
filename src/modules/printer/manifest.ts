import { Printer } from "lucide-react";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { PrinterSettingsPanel } from "./components/admin/PrinterSettingsPanel";

export const printerManifest: ModuleManifest = {
  id: "printers",
  flagKey: "comandas_enabled",
  settingsPanel: PrinterSettingsPanel,
  settingsLabel: "Impresoras",
  settingsIcon: Printer,
};
