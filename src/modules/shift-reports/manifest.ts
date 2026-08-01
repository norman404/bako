import { Clock } from "lucide-react";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { ShiftControlPanel } from "./components/ShiftControlPanel";

export const shiftReportsManifest: ModuleManifest = {
  id: "shift-reports",
  flagKey: "shift_management_enabled",
  settingsPanel: ShiftControlPanel,
  settingsLabel: "Turnos",
  settingsIcon: Clock,
};
