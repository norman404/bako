import { GeneralSettingsCard } from "./GeneralSettingsCard";

export function SystemSettingsPanel() {
  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-surface-sunken overflow-hidden">
        <GeneralSettingsCard />
      </div>
    </div>
  );
}
