import { create } from "zustand";
import { eq } from "drizzle-orm";
import { ResultAsync, okAsync } from "neverthrow";
import { db } from "@/shared/db/client";
import { systemSettings } from "@/shared/db/schema";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";

type PrinterType = "usb" | "network" | "none";

interface SettingsState {
  locale: string;
  currency: string;
  printerType: PrinterType;
  printerAddress: string | null;
  isLoading: boolean;
  initializeSettings: () => ResultAsync<void, never>;
  updateSettings: (locale: string, currency: string) => ResultAsync<void, Error>;
  updatePrinterSettings: (printerType: PrinterType, printerAddress: string | null) => ResultAsync<void, Error>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  locale: DEFAULT_CURRENCY_CONFIG.locale,
  currency: DEFAULT_CURRENCY_CONFIG.currency,
  printerType: "none",
  printerAddress: null,
  isLoading: true,

  initializeSettings: (): ResultAsync<void, never> => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ locale: DEFAULT_CURRENCY_CONFIG.locale, currency: DEFAULT_CURRENCY_CONFIG.currency, printerType: "none", printerAddress: null, isLoading: false });
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
          printerType: "none",
          printerAddress: null,
          updatedAt: now,
        });
        set({ locale: DEFAULT_CURRENCY_CONFIG.locale, currency: DEFAULT_CURRENCY_CONFIG.currency, printerType: "none", printerAddress: null, isLoading: false });
      } else {
        const row = result[0];
        set({
          locale: row.locale,
          currency: row.currency,
          printerType: (row.printerType as PrinterType) ?? "none",
          printerAddress: row.printerAddress ?? null,
          isLoading: false,
        });
      }
    };

    return ResultAsync.fromPromise(
      dbOperation(),
      (error) => (error instanceof Error ? error : new Error(String(error))),
    ).orElse((error) => {
      console.warn("Tauri IPC SQLite not available. Activating Vitest/Node fallback.", error);
      set({ locale: DEFAULT_CURRENCY_CONFIG.locale, currency: DEFAULT_CURRENCY_CONFIG.currency, printerType: "none", printerAddress: null, isLoading: false });
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
    const { printerType, printerAddress } = get();
    const dbOperation = db
      .insert(systemSettings)
      .values({ id: "current", locale, currency, printerType, printerAddress, updatedAt: now })
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

  updatePrinterSettings: (printerType: PrinterType, printerAddress: string | null): ResultAsync<void, Error> => {
    set({ isLoading: true });
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ printerType, printerAddress, isLoading: false });
      return okAsync(undefined);
    }

    const now = new Date();
    const { locale, currency } = get();
    const dbOperation = db
      .insert(systemSettings)
      .values({ id: "current", locale, currency, printerType, printerAddress, updatedAt: now })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: { printerType, printerAddress, updatedAt: now },
      })
      .then(() => {
        set({ printerType, printerAddress, isLoading: false });
      });

    return ResultAsync.fromPromise(
      dbOperation,
      (error) => (error instanceof Error ? error : new Error("Failed to persist printer settings")),
    );
  },
}));
