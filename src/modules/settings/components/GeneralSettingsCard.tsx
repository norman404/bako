import { useState } from "react";
import { Globe, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/modules/settings/store/settings-store";

export function GeneralSettingsCard() {
  const { t } = useTranslation("settings");
  const {
    locale: currentLocale,
    currency: currentCurrency,
    updateSettings,
    isLoading,
  } = useSettingsStore();

  const [locale, setLocale] = useState(currentLocale);
  const [currency, setCurrency] = useState(currentCurrency);

  const SUPPORTED_LOCALES = [
    { value: "es-MX", label: t("locales.esMX") },
    { value: "es-AR", label: t("locales.esAR") },
    { value: "en-US", label: t("locales.enUS") },
    { value: "es-ES", label: t("locales.esES") },
    { value: "pt-BR", label: t("locales.ptBR") },
  ];

  const SUPPORTED_CURRENCIES = [
    { value: "MXN", label: t("currencies.mxn") },
    { value: "ARS", label: t("currencies.ars") },
    { value: "USD", label: t("currencies.usd") },
    { value: "EUR", label: t("currencies.eur") },
    { value: "BRL", label: t("currencies.brl") },
  ];

  const hasChanges = locale !== currentLocale || currency !== currentCurrency;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasChanges) return;

    const result = await updateSettings(locale, currency);
    result.match(
      () =>
        toast.success(t("system.saveSuccess"), {
          description: t("system.saveSuccessDesc", { locale, currency }),
        }),
      () => toast.error(t("system.saveError")),
    );
  };

  return (
    <div className="rounded-card border border-hairline bg-obsidian-raised overflow-hidden">
      <div className="flex items-center gap-3 border-b border-hairline px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-sharp bg-surface1">
          <Globe className="h-4 w-4 text-champagne" />
        </div>
        <div>
          <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink">
            {t("system.title")}
          </h3>
          <p className="text-[11px] text-ink-dim">Idioma y moneda del sistema</p>
        </div>
      </div>

      <form className="grid gap-5 p-5" onSubmit={handleSubmit}>
        <div className="grid gap-1.5">
          <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
            {t("system.localeLabel")}
          </Label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger data-testid="locale-select-trigger">
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

        <div className="grid gap-1.5">
          <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
            {t("system.currencyLabel")}
          </Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger data-testid="currency-select-trigger">
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

        <div className="flex items-center justify-end gap-2 pt-1">
          {hasChanges && (
            <span className="text-[11px] text-champagne">Cambios sin guardar</span>
          )}
          <Button
            type="submit"
            variant="default"
            size="small"
            disabled={isLoading || !hasChanges}
            className="rounded-card bg-champagne text-obsidian hover:bg-champagne/90"
          >
            <Save className="h-3.5 w-3.5" />
            {t("system.saveButton")}
          </Button>
        </div>
      </form>
    </div>
  );
}
