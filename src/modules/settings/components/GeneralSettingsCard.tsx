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
import { useSettingsStore } from "../settings-store";

export function GeneralSettingsCard() {
  const { t } = useTranslation("settings");
  const {
    locale,
    currency,
    updateSettings,
  } = useSettingsStore();

  const SUPPORTED_LOCALES = [
    { value: "es-MX", label: t("locales.esMX") },
    { value: "en-US", label: t("locales.enUS") },
  ];

  const SUPPORTED_CURRENCIES = [
    { value: "MXN", label: t("currencies.mxn") },
    { value: "USD", label: t("currencies.usd") },
  ];

  async function handleLocaleChange(newLocale: string) {
    const result = await updateSettings(newLocale, currency);
    result.match(
      () => toast.success(t("system.saveSuccess"), {
        description: t("system.saveSuccessDesc", { locale: newLocale, currency }),
      }),
      () => toast.error(t("system.saveError")),
    );
  }

  async function handleCurrencyChange(newCurrency: string) {
    const result = await updateSettings(locale, newCurrency);
    result.match(
      () => toast.success(t("system.saveSuccess"), {
        description: t("system.saveSuccessDesc", { locale, currency: newCurrency }),
      }),
      () => toast.error(t("system.saveError")),
    );
  }

  return (
    <div>
      {/* Locale row */}
      <div className="px-5">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <Label
            htmlFor="settings-locale"
            className="text-sm normal-case tracking-normal text-text"
          >
            {t("system.localeLabel")}
          </Label>
          <Select value={locale} onValueChange={handleLocaleChange}>
            <SelectTrigger
              id="settings-locale"
              data-testid="locale-select-trigger"
              className="w-[220px]"
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
        </div>
      </div>

      {/* Currency row */}
      <div className="px-5">
        <div className="flex items-center justify-between py-3 border-b border-border">
          <Label
            htmlFor="settings-currency"
            className="text-sm normal-case tracking-normal text-text"
          >
            {t("system.currencyLabel")}
          </Label>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger
              id="settings-currency"
              data-testid="currency-select-trigger"
              className="w-[220px]"
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
        </div>
      </div>
    </div>
  );
}
