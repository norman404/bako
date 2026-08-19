import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { requestSettingsOperation } from "../settings-window-client";
import { SETTINGS_RPC_OPERATION } from "../settings-window-protocol";
import { useSettingsWindowStore } from "../settings-window-store";

export function GeneralSettingsCard() {
  const { t } = useTranslation("settings");
  const snapshot = useSettingsWindowStore((state) => state.snapshot);

  if (!snapshot) return null;

  const SUPPORTED_LOCALES = [
    { value: "es-MX", label: t("locales.esMX") },
    { value: "en-US", label: t("locales.enUS") },
  ];

  const SUPPORTED_CURRENCIES = [
    { value: "MXN", label: t("currencies.mxn") },
    { value: "USD", label: t("currencies.usd") },
  ];

  async function updateRegionalSettings(locale: string, currency: string) {
    try {
      const updated = await requestSettingsOperation(SETTINGS_RPC_OPERATION.UPDATE_REGIONAL, {
        locale,
        currency,
      });
      useSettingsWindowStore.getState().applySnapshot(updated);
      toast.success(t("system.saveSuccess"), {
        description: t("system.saveSuccessDesc", { locale, currency }),
      });
    } catch {
      toast.error(t("system.saveError"));
    }
  }

  return (
    <>
      <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
        <Label htmlFor="settings-locale">{t("system.localeLabel")}</Label>
        <Select
          value={snapshot.locale}
          onValueChange={(locale) => void updateRegionalSettings(locale, snapshot.currency)}
        >
          <SelectTrigger
            id="settings-locale"
            data-testid="locale-select-trigger"
            className="mt-2.5 w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LOCALES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-xs leading-relaxed text-text-dim">{t("system.localeHelp")}</p>
      </div>

      <div className="rounded-card border border-border bg-surface-raised p-4 shadow-card">
        <Label htmlFor="settings-currency">{t("system.currencyLabel")}</Label>
        <Select
          value={snapshot.currency}
          onValueChange={(currency) => void updateRegionalSettings(snapshot.locale, currency)}
        >
          <SelectTrigger
            id="settings-currency"
            data-testid="currency-select-trigger"
            className="mt-2.5 w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_CURRENCIES.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2.5 text-xs leading-relaxed text-text-dim">{t("system.currencyHelp")}</p>
      </div>
    </>
  );
}
