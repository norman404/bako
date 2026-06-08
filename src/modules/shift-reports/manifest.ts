import { Clock } from "lucide-react";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { ShiftHistoryPanel } from "./components/ShiftHistoryPanel";

export const shiftReportsManifest: ModuleManifest = {
  id: "shift-reports",
  flagKey: "shift_management_enabled",
  settingsPanel: ShiftHistoryPanel,
  settingsLabel: "Turnos",
  settingsIcon: Clock,
};
