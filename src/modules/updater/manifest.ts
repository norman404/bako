import { Download } from "lucide-react";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { UpdateSettingsPanel } from "./components/UpdateSettingsPanel";

export const updaterManifest: ModuleManifest = {
  id: "updater",
  // No flagKey: the panel must always be visible so the operator can toggle
  // auto_update_enabled without losing access to the tab that controls it.
  settingsPanel: UpdateSettingsPanel,
  // Resolved by SettingsModal via t() in the `settings` namespace — keeps the
  // tab label translated per locale (en-US "Updates", pt-BR "Atualizações", ...).
  settingsLabelKey: "sections.updater",
  settingsIcon: Download,
};