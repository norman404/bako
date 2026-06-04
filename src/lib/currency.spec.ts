import { describe, expect, it, beforeEach } from "vitest";
import { formatPosCurrency, sortStrings } from "@/lib/currency";
import { useSettingsStore } from "@/modules/settings/store/settings-store";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";

describe("Currency & Sorting Library", () => {
  beforeEach(() => {
    // Reset store to default configurations before each test
    useSettingsStore.setState({
      locale: DEFAULT_CURRENCY_CONFIG.locale,
      currency: DEFAULT_CURRENCY_CONFIG.currency,
      printerType: "none",
      printerAddress: null,
      isLoading: false,
    });
  });

  describe("Zustand Store Vitest Fallback", () => {
    it("should initialize with default Mexican Peso settings when Tauri is not present", async () => {
      // In Vitest environment, Tauri is not present. Let's call initializeSettings.
      await useSettingsStore.getState().initializeSettings();
      
      const state = useSettingsStore.getState();
      expect(state.locale).toBe("es-MX");
      expect(state.currency).toBe("MXN");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("formatPosCurrency", () => {
    it("formats cents with two decimal places using default Mexican settings", () => {
      // 5550 cents = 55.50
      const formatted = formatPosCurrency(5550).replace(/\u00a0/g, " "); // normalize non-breaking spaces
      expect(formatted).toContain("55.50");
      expect(formatted).toContain("$");
    });

    it("formats reactively when locale and currency are updated in the store", async () => {
      // Scenario: Update preferences from es-MX/MXN to es-AR/ARS
      await useSettingsStore.getState().updateSettings("es-AR", "ARS");

      const formatted = formatPosCurrency(10000).replace(/\u00a0/g, " "); // 100.00 pesos
      // es-AR uses comma as decimal separator, e.g. $ 100,00 or $100,00
      expect(formatted).toContain("100,00");
      expect(formatted).toContain("$");
    });

    it("formats other global currencies correctly", async () => {
      // USD format
      await useSettingsStore.getState().updateSettings("en-US", "USD");
      let formatted = formatPosCurrency(123456).replace(/\u00a0/g, " "); // $1,234.56
      expect(formatted).toContain("$1,234.56");

      // EUR format
      await useSettingsStore.getState().updateSettings("es-ES", "EUR");
      formatted = formatPosCurrency(9999).replace(/\u00a0/g, " "); // 99,99 €
      expect(formatted).toContain("99,99");
      expect(formatted).toContain("€");
    });
  });

  describe("sortStrings (Locale-Aware Sorting)", () => {
    it("sorts alphabetically respecting Spanish collation", () => {
      useSettingsStore.setState({ locale: "es", currency: "MXN", printerType: "none", printerAddress: null });
      const items = ["Zorra", "Árbol", "Barco"];
      const sorted = sortStrings(items);
      
      // In Spanish, Árbol should come before Barco, which comes before Zorra
      expect(sorted).toEqual(["Árbol", "Barco", "Zorra"]);
    });

    it("reacts dynamically to changed locale in the store", () => {
      // In some locales, character sorting is different. Let's verify sortStrings uses active locale.
      useSettingsStore.setState({ locale: "en", currency: "MXN", printerType: "none", printerAddress: null });
      const items = ["a", "Z", "ä"];
      
      // Let's check English vs Swedish/German
      sortStrings(items);
      
      useSettingsStore.setState({ locale: "sv", currency: "MXN", printerType: "none", printerAddress: null }); // Swedish (ä is sorted at the end of the alphabet after z)
      const sortedSv = sortStrings(items);
      
      // They should differ since Swedish sorts ä after z
      expect(sortedSv[sortedSv.length - 1]).toBe("ä");
    });
  });
});
