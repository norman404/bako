import { GeneralSettingsCard } from "./GeneralSettingsCard";
import { PrinterSettingsCard } from "./PrinterSettingsCard";

export function SystemSettingsPanel() {
  return (
    <div className="grid gap-5 max-w-xl">
      <GeneralSettingsCard />
      <PrinterSettingsCard />
    </div>
  );
}
