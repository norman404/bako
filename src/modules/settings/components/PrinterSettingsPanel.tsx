import { PrinterSettingsCard } from "./PrinterSettingsCard";

export function PrinterSettingsPanel() {
  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-surface-sunken overflow-hidden">
        <PrinterSettingsCard />
      </div>
    </div>
  );
}
