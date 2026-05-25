import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useSettingsStore } from "@/modules/settings/store/settings-store";

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

const FIELD_INPUT_CLASS = [
  "h-9 w-full rounded-card border border-hairline bg-obsidian px-3",
  "text-[13px] text-ink outline-none",
  "placeholder:text-ink-dim",
  "transition-colors duration-150",
  "focus-visible:border-champagne/40 focus-visible:ring-1 focus-visible:ring-champagne/20",
].join(" ");

const FIELD_LABEL_CLASS = "grid gap-1 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim";

export function SystemSettingsPanel() {
  const { locale: currentLocale, currency: currentCurrency, updateSettings, isLoading } = useSettingsStore();

  const [locale, setLocale] = useState(currentLocale);
  const [currency, setCurrency] = useState(currentCurrency);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateSettings(locale, currency);
      toast.success("Configuración regional actualizada", {
        description: `Región: ${locale} · Divisa: ${currency}`,
      });
    } catch (error) {
      toast.error("No se pudo guardar la configuración");
    }
  };

  return (
    <div className="grid min-h-full grid-rows-[auto_1fr] gap-3">
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Sistema</h2>
      </header>

      <div className="mt-2.5 max-w-lg">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className={FIELD_LABEL_CLASS}>
            Idioma / Región (Locale)
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className={FIELD_INPUT_CLASS}
            >
              {SUPPORTED_LOCALES.map((item) => (
                <option key={item.value} value={item.value} className="bg-obsidian text-ink">
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={FIELD_LABEL_CLASS}>
            Moneda / Divisa
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={FIELD_INPUT_CLASS}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item.value} value={item.value} className="bg-obsidian text-ink">
                  {item.label}
                </option>
              ))}
            </select>
          </label>

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
