import { eq } from "drizzle-orm";
import { create } from "zustand";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { db } from "@/db/client";
import { systemSettings } from "@/db/schema";
import { DEFAULT_CURRENCY_CONFIG } from "@/lib/currency-config";

import {
  SHIFT_LIST_ORDER,
  type ShiftListOrder,
} from "./settings-window-protocol";

type PrinterType = "usb" | "network" | "none";

interface SettingsState {
  locale: string;
  currency: string;
  printerType: PrinterType;
  printerAddress: string | null;
  comandaHeaderText: string | null;
  shiftListOrder: ShiftListOrder;
  isLoading: boolean;
  initializeSettings: () => ResultAsync<void, never>;
  updateSettings: (locale: string, currency: string) => ResultAsync<void, Error>;
  updatePrinterSettings: (printerType: PrinterType, printerAddress: string | null) => ResultAsync<void, Error>;
  updateComandaHeaderText: (text: string | null) => ResultAsync<void, Error>;
  updateShiftListOrder: (order: ShiftListOrder) => ResultAsync<void, Error>;
}

function normalizeShiftListOrder(value: string | null | undefined): ShiftListOrder {
  return value === SHIFT_LIST_ORDER.ASCENDING
    ? SHIFT_LIST_ORDER.ASCENDING
    : SHIFT_LIST_ORDER.DESCENDING;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  locale: DEFAULT_CURRENCY_CONFIG.locale,
  currency: DEFAULT_CURRENCY_CONFIG.currency,
  printerType: "none",
  printerAddress: null,
  comandaHeaderText: null,
  shiftListOrder: SHIFT_LIST_ORDER.DESCENDING,
  isLoading: true,

  initializeSettings: (): ResultAsync<void, never> => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({
        locale: DEFAULT_CURRENCY_CONFIG.locale,
        currency: DEFAULT_CURRENCY_CONFIG.currency,
        printerType: "none",
        printerAddress: null,
        comandaHeaderText: null,
        shiftListOrder: SHIFT_LIST_ORDER.DESCENDING,
        isLoading: false,
      });
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
          comandaHeaderText: null,
          shiftListOrder: SHIFT_LIST_ORDER.DESCENDING,
          updatedAt: now,
        });
        set({
          locale: DEFAULT_CURRENCY_CONFIG.locale,
          currency: DEFAULT_CURRENCY_CONFIG.currency,
          printerType: "none",
          printerAddress: null,
          comandaHeaderText: null,
          shiftListOrder: SHIFT_LIST_ORDER.DESCENDING,
          isLoading: false,
        });
      } else {
        const row = result[0];
        set({
          locale: row.locale,
          currency: row.currency,
          printerType: (row.printerType as PrinterType) ?? "none",
          printerAddress: row.printerAddress ?? null,
          comandaHeaderText: row.comandaHeaderText ?? null,
          shiftListOrder: normalizeShiftListOrder(row.shiftListOrder),
          isLoading: false,
        });
      }
    };

    return ResultAsync.fromPromise(
      dbOperation(),
      (error) => (error instanceof Error ? error : new Error(String(error))),
    ).orElse((error) => {
      console.warn("Tauri IPC SQLite not available. Activating Vitest/Node fallback.", error);
      set({
        locale: DEFAULT_CURRENCY_CONFIG.locale,
        currency: DEFAULT_CURRENCY_CONFIG.currency,
        printerType: "none",
        printerAddress: null,
        comandaHeaderText: null,
        shiftListOrder: SHIFT_LIST_ORDER.DESCENDING,
        isLoading: false,
      });
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
    const { printerType, printerAddress, comandaHeaderText, shiftListOrder } = get();
    const dbOperation = db
      .insert(systemSettings)
      .values({
        id: "current",
        locale,
        currency,
        printerType,
        printerAddress,
        comandaHeaderText,
        shiftListOrder,
        updatedAt: now,
      })
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
    ).orElse((error) => {
      set({ isLoading: false });
      return errAsync(error);
    });
  },

  updatePrinterSettings: (printerType: PrinterType, printerAddress: string | null): ResultAsync<void, Error> => {
    set({ isLoading: true });
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ printerType, printerAddress, isLoading: false });
      return okAsync(undefined);
    }

    const now = new Date();
    const { locale, currency, comandaHeaderText, shiftListOrder } = get();
    const dbOperation = db
      .insert(systemSettings)
      .values({
        id: "current",
        locale,
        currency,
        printerType,
        printerAddress,
        comandaHeaderText,
        shiftListOrder,
        updatedAt: now,
      })
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
    ).orElse((error) => {
      set({ isLoading: false });
      return errAsync(error);
    });
  },

  updateComandaHeaderText: (text: string | null): ResultAsync<void, Error> => {
    set({ isLoading: true });
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ comandaHeaderText: text, isLoading: false });
      return okAsync(undefined);
    }

    const now = new Date();
    const { locale, currency, printerType, printerAddress, shiftListOrder } = get();
    const dbOperation = db
      .insert(systemSettings)
      .values({
        id: "current",
        locale,
        currency,
        printerType,
        printerAddress,
        comandaHeaderText: text,
        shiftListOrder,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: { comandaHeaderText: text, updatedAt: now },
      })
      .then(() => {
        set({ comandaHeaderText: text, isLoading: false });
      });

    return ResultAsync.fromPromise(
      dbOperation,
      (error) => (error instanceof Error ? error : new Error("Failed to persist comanda header text")),
    ).orElse((error) => {
      set({ isLoading: false });
      return errAsync(error);
    });
  },

  updateShiftListOrder: (order: ShiftListOrder): ResultAsync<void, Error> => {
    set({ isLoading: true });
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
    if (!isTauri) {
      set({ shiftListOrder: order, isLoading: false });
      return okAsync(undefined);
    }

    const now = new Date();
    const { locale, currency, printerType, printerAddress, comandaHeaderText } = get();
    const dbOperation = db
      .insert(systemSettings)
      .values({
        id: "current",
        locale,
        currency,
        printerType,
        printerAddress,
        comandaHeaderText,
        shiftListOrder: order,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: { shiftListOrder: order, updatedAt: now },
      })
      .then(() => {
        set({ shiftListOrder: order, isLoading: false });
      });

    return ResultAsync.fromPromise(
      dbOperation,
      (error) => (error instanceof Error ? error : new Error("Failed to persist shift list order")),
    ).orElse((error) => {
      set({ isLoading: false });
      return errAsync(error);
    });
  },
}));
