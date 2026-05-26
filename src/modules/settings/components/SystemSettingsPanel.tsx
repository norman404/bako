import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export function SystemSettingsPanel() {
  const { t } = useTranslation('settings');
  const { locale: currentLocale, currency: currentCurrency, updateSettings, isLoading } = useSettingsStore();

  const [locale, setLocale] = useState(currentLocale);
  const [currency, setCurrency] = useState(currentCurrency);

  const SUPPORTED_LOCALES = [
    { value: "es-MX", label: t('locales.esMX') },
    { value: "es-AR", label: t('locales.esAR') },
    { value: "en-US", label: t('locales.enUS') },
    { value: "es-ES", label: t('locales.esES') },
    { value: "pt-BR", label: t('locales.ptBR') },
  ];

  const SUPPORTED_CURRENCIES = [
    { value: "MXN", label: t('currencies.mxn') },
    { value: "ARS", label: t('currencies.ars') },
    { value: "USD", label: t('currencies.usd') },
    { value: "EUR", label: t('currencies.eur') },
    { value: "BRL", label: t('currencies.brl') },
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await updateSettings(locale, currency);
    result.match(
      () => toast.success(t('system.saveSuccess'), {
        description: t('system.saveSuccessDesc', { locale, currency }),
      }),
      () => toast.error(t('system.saveError')),
    );
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{t('system.title')}</h2>
      </header>

      <div className="mt-2.5 max-w-lg">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              {t('system.localeLabel')}
            </Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger data-testid="locale-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              {t('system.currencyLabel')}
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger data-testid="currency-select-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end border-t border-hairline pt-4 mt-2">
            <Button
              type="submit"
              variant="default"
              size="small"
              className="rounded-card bg-champagne text-obsidian hover:bg-champagne/90"
              disabled={isLoading}
            >
              <Save className="h-3.5 w-3.5" />
              {t('system.saveButton')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
