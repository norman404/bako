import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPPORTED_LOCALES = [
  { value: "es-MX", label: "Español (México)" },
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "en-US", label: "English (United States)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

const SUPPORTED_CURRENCIES = [
  { value: "MXN", label: "MXN ($ - Peso Mexicano)" },
  { value: "ARS", label: "ARS ($ - Peso Argentino)" },
  { value: "USD", label: "USD ($ - Dólar Estadounidense)" },
  { value: "EUR", label: "EUR (€ - Euro)" },
  { value: "BRL", label: "BRL (R$ - Real Brasileño)" },
];


export function SystemSettingsPanel() {
  const { locale: currentLocale, currency: currentCurrency, updateSettings, isLoading } = useSettingsStore();

  const [locale, setLocale] = useState(currentLocale);
  const [currency, setCurrency] = useState(currentCurrency);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await updateSettings(locale, currency);
    result.match(
      () => toast.success("Configuración regional actualizada", {
        description: `Región: ${locale} · Divisa: ${currency}`,
      }),
      () => toast.error("No se pudo guardar la configuración"),
    );
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Sistema</h2>
      </header>

      <div className="mt-2.5 max-w-lg">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <Label className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim">
              Idioma / Región (Locale)
            </Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger>
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
              Moneda / Divisa
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
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
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-card bg-champagne px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-obsidian transition-colors duration-150 hover:bg-champagne/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
