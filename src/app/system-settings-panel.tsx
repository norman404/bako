import { DatabaseSettingsCard } from "@/modules/settings/settings-window-entry";
import { UpdateSettingsPanel } from "@/modules/updater/settings-window-entry";

export function SystemSettingsPanel() {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <DatabaseSettingsCard />
      <UpdateSettingsPanel />
    </div>
  );
}
