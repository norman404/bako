import { create } from "zustand";
import type { DownloadEvent } from "@tauri-apps/plugin-updater";

import {
  type UpdateInfo,
  createIdleStatus,
  createCheckingStatus,
  createAvailableStatus,
  createDownloadingStatus,
  createReadyToInstallStatus,
  createErrorStatus,
} from "@/modules/updater/domain/update-status";
import {
  type UpdateHandle,
  checkForUpdate,
  downloadAndInstallUpdate,
  relaunchApplication,
} from "@/modules/updater/adapters/tauri-updater.adapter";

interface UpdateHandleInfo {
  version: string;
  notes: string;
  handle: UpdateHandle;
}

export interface UpdaterState {
  /** Current updater status — the single source of truth shared by every consumer. */
  status: UpdateInfo;
  /** Handle of the detected update. Internal — not selected by the hook. */
  _updateHandle: UpdateHandleInfo | null;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  relaunch: () => Promise<void>;
  reset: () => void;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useUpdaterStore = create<UpdaterState>((set, get) => ({
  status: createIdleStatus(),
  _updateHandle: null,

  checkForUpdates: async () => {
    set({ status: createCheckingStatus() });

    try {
      const info = await checkForUpdate();

      if (!info) {
        set({ status: createIdleStatus(), _updateHandle: null });
        return;
      }

      set({
        status: createAvailableStatus({ version: info.version, notes: info.notes }),
        _updateHandle: {
          version: info.version,
          notes: info.notes,
          handle: info.handle,
        },
      });
    } catch (error) {
      set({ status: createErrorStatus(toMessage(error)) });
    }
  },

  downloadAndInstall: async () => {
    const current = get()._updateHandle;

    if (!current) {
      set({ status: createErrorStatus("No update available to install") });
      return;
    }

    let downloaded = 0;
    let contentLength = 0;

    try {
      await downloadAndInstallUpdate(current.handle, (event: DownloadEvent) => {
        switch (event.event) {
          case "Started": {
            contentLength = event.data.contentLength ?? 0;
            downloaded = 0;
            break;
          }
          case "Progress": {
            downloaded += event.data.chunkLength;
            break;
          }
          case "Finished": {
            break;
          }
        }

        set({ status: createDownloadingStatus({ downloaded, contentLength }) });
      });

      set({ status: createReadyToInstallStatus(current.version) });
    } catch (error) {
      set({ status: createErrorStatus(toMessage(error)) });
    }
  },

  relaunch: async () => {
    try {
      await relaunchApplication();
    } catch (error) {
      set({ status: createErrorStatus(toMessage(error)) });
    }
  },

  reset: () => {
    set({ status: createIdleStatus(), _updateHandle: null });
  },
}));