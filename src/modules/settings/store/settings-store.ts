import { create } from "zustand";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db/client";
import { systemSettings } from "@/shared/db/schema";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";

interface SettingsState {
  locale: string;
  currency: string;
  isLoading: boolean;
  initializeSettings: () => Promise<void>;
  updateSettings: (locale: string, currency: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: DEFAULT_CURRENCY_CONFIG.locale,
  currency: DEFAULT_CURRENCY_CONFIG.currency,
  isLoading: true,

  initializeSettings: async () => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({
        locale: DEFAULT_CURRENCY_CONFIG.locale,
        currency: DEFAULT_CURRENCY_CONFIG.currency,
        isLoading: false,
      });
      return;
    }

    try {
      // Consultar si ya existe el registro único de configuración
      const result = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.id, "current"))
        .limit(1);

      if (result.length === 0) {
        const now = new Date();
        // Sembrar valores por defecto si la base de datos está vacía
        await db.insert(systemSettings).values({
          id: "current",
          locale: DEFAULT_CURRENCY_CONFIG.locale,
          currency: DEFAULT_CURRENCY_CONFIG.currency,
          updatedAt: now,
        });
        set({
          locale: DEFAULT_CURRENCY_CONFIG.locale,
          currency: DEFAULT_CURRENCY_CONFIG.currency,
          isLoading: false,
        });
      } else {
        set({
          locale: result[0].locale,
          currency: result[0].currency,
          isLoading: false,
        });
      }
    } catch (error) {
      console.warn("Tauri IPC SQLite not available. Activating Vitest/Node fallback.", error);
      set({
        locale: DEFAULT_CURRENCY_CONFIG.locale,
        currency: DEFAULT_CURRENCY_CONFIG.currency,
        isLoading: false,
      });
    }
  },

  updateSettings: async (locale: string, currency: string) => {
    set({ isLoading: true });
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ locale, currency, isLoading: false });
      return;
    }

    try {
      const now = new Date();
      await db
        .insert(systemSettings)
        .values({ id: "current", locale, currency, updatedAt: now })
        .onConflictDoUpdate({
          target: systemSettings.id,
          set: { locale, currency, updatedAt: now },
        });
      set({ locale, currency, isLoading: false });
    } catch (error) {
      console.error("Failed to persist settings in SQLite", error);
      set({ locale, currency, isLoading: false });
    }
  },
}));
