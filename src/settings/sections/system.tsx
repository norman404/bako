import { HardDrive } from "lucide-react";

import {
  NAVIGATION_GROUP,
  NAVIGATION_SURFACE,
  type ModuleNavigationEntry,
} from "@/app/module-manifest";
import { DatabaseSettingsCard } from "@/modules/settings/settings-window-entry";
import { UpdateSettingsPanel } from "@/modules/updater/settings-window-entry";

function SystemSettingsPanel() {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <DatabaseSettingsCard />
      <UpdateSettingsPanel />
    </div>
  );
}

export const SYSTEM_SECTION: ModuleNavigationEntry = {
  id: "system",
  surface: NAVIGATION_SURFACE.SETTINGS,
  group: NAVIGATION_GROUP.SYSTEM,
  order: 10,
  labelKey: "settings:sections.system",
  descriptionKey: "settings:sections.systemDesc",
  icon: HardDrive,
  Component: SystemSettingsPanel,
};
