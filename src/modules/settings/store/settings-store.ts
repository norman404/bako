import { create } from "zustand";
import { eq } from "drizzle-orm";
import { ResultAsync, okAsync } from "neverthrow";
import { db } from "@/shared/db/client";
import { systemSettings } from "@/shared/db/schema";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";

interface SettingsState {
  locale: string;
  currency: string;
  isLoading: boolean;
  initializeSettings: () => ResultAsync<void, never>;
  updateSettings: (locale: string, currency: string) => ResultAsync<void, Error>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: DEFAULT_CURRENCY_CONFIG.locale,
  currency: DEFAULT_CURRENCY_CONFIG.currency,
  isLoading: true,

  initializeSettings: (): ResultAsync<void, never> => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ locale: DEFAULT_CURRENCY_CONFIG.locale, currency: DEFAULT_CURRENCY_CONFIG.currency, isLoading: false });
      return okAsync(undefined);
    }

    const dbOperation = async () => {
      const result = await db.select().from(systemSettings).where(eq(systemSettings.id, "current")).limit(1);
      if (result.length === 0) {
        const now = new Date();
        await db.insert(systemSettings).values({
          id: "current",
          locale: DEFAULT_CURRENCY_CONFIG.locale,
          currency: DEFAULT_CURRENCY_CONFIG.currency,
          updatedAt: now,
        });
        set({ locale: DEFAULT_CURRENCY_CONFIG.locale, currency: DEFAULT_CURRENCY_CONFIG.currency, isLoading: false });
      } else {
        set({ locale: result[0].locale, currency: result[0].currency, isLoading: false });
      }
    };

    return ResultAsync.fromPromise(
      dbOperation(),
      (error) => (error instanceof Error ? error : new Error(String(error))),
    ).orElse((error) => {
      console.warn("Tauri IPC SQLite not available. Activating Vitest/Node fallback.", error);
      set({ locale: DEFAULT_CURRENCY_CONFIG.locale, currency: DEFAULT_CURRENCY_CONFIG.currency, isLoading: false });
      return okAsync(undefined);
    });
  },

  updateSettings: (locale: string, currency: string): ResultAsync<void, Error> => {
    set({ isLoading: true });
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ locale, currency, isLoading: false });
      return okAsync(undefined);
    }

    const now = new Date();
    const dbOperation = db
      .insert(systemSettings)
      .values({ id: "current", locale, currency, updatedAt: now })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: { locale, currency, updatedAt: now },
      })
      .then(() => {
        set({ locale, currency, isLoading: false });
      });

    return ResultAsync.fromPromise(
      dbOperation,
      (error) => (error instanceof Error ? error : new Error("Failed to persist settings")),
    );
  },
}));
