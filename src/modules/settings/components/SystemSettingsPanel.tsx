import { DatabaseSettingsCard } from "./DatabaseSettingsCard";
import { GeneralSettingsCard } from "./GeneralSettingsCard";

export function SystemSettingsPanel() {
  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface-sunken/30">
        <GeneralSettingsCard />
        <DatabaseSettingsCard />
      </div>
    </div>
  );
}
