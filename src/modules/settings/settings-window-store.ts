import { create } from "zustand";

import {
  SETTINGS_CHANGE_KIND,
  type SettingsSnapshot,
  type SettingsWindowChange,
} from "./settings-window-protocol";

const SETTINGS_WINDOW_LOAD_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
} as const;

type SettingsWindowLoadStatus =
  (typeof SETTINGS_WINDOW_LOAD_STATUS)[keyof typeof SETTINGS_WINDOW_LOAD_STATUS];

interface SettingsWindowState {
  snapshot: SettingsSnapshot | null;
  status: SettingsWindowLoadStatus;
  error: string | null;
  printerRevision: number;
  setLoading: () => void;
  applySnapshot: (snapshot: SettingsSnapshot) => void;
  applyChange: (change: SettingsWindowChange) => void;
  setError: (message: string) => void;
}

const useSettingsWindowStore = create<SettingsWindowState>((set) => ({
  snapshot: null,
  status: SETTINGS_WINDOW_LOAD_STATUS.IDLE,
  error: null,
  printerRevision: 0,

  setLoading: () => set({ status: SETTINGS_WINDOW_LOAD_STATUS.LOADING, error: null }),

  applySnapshot: (snapshot) =>
    set({
      snapshot,
      status: SETTINGS_WINDOW_LOAD_STATUS.READY,
      error: null,
    }),

  applyChange: (change) => {
    switch (change.kind) {
      case SETTINGS_CHANGE_KIND.SETTINGS:
        set({ snapshot: change.value, status: SETTINGS_WINDOW_LOAD_STATUS.READY, error: null });
        return;
      case SETTINGS_CHANGE_KIND.FLAGS:
        set((state) =>
          state.snapshot
            ? { snapshot: { ...state.snapshot, flags: change.value } }
            : {},
        );
        return;
      case SETTINGS_CHANGE_KIND.UPDATER:
        set((state) =>
          state.snapshot
            ? { snapshot: { ...state.snapshot, updater: change.value } }
            : {},
        );
        return;
      case SETTINGS_CHANGE_KIND.PRINTERS_INVALIDATED:
        set((state) => ({ printerRevision: state.printerRevision + 1 }));
        return;
    }
  },

  setError: (message) => set({ status: SETTINGS_WINDOW_LOAD_STATUS.ERROR, error: message }),
}));

export { SETTINGS_WINDOW_LOAD_STATUS, useSettingsWindowStore };
export type { SettingsWindowLoadStatus, SettingsWindowState };
