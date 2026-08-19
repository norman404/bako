import { GeneralSettingsCard } from "./GeneralSettingsCard";

export function GeneralSettingsPanel() {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <GeneralSettingsCard />
    </div>
  );
}
