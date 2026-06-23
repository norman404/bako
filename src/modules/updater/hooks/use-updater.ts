import { useShallow } from "zustand/react/shallow";

import { useUpdaterStore } from "@/modules/updater/store/updater-store";
import { UpdateStatus, type UpdateInfo } from "@/modules/updater/domain/update-status";

export interface UseUpdaterResult {
  status: UpdateInfo;
  isChecking: boolean;
  hasUpdate: boolean;
  isDownloading: boolean;
  isReadyToInstall: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  relaunch: () => Promise<void>;
  reset: () => void;
}

/**
 * Thin selector over the shared `useUpdaterStore`.
 *
 * The store is the single source of truth — every consumer (the App toast, the
 * Settings panel) observes the same status. This hook only projects the store
 * state into the `UseUpdaterResult` shape and derives the boolean flags.
 */
export function useUpdater(): UseUpdaterResult {
  const { status, checkForUpdates, downloadAndInstall, relaunch, reset } = useUpdaterStore(
    useShallow((state) => ({
      status: state.status,
      checkForUpdates: state.checkForUpdates,
      downloadAndInstall: state.downloadAndInstall,
      relaunch: state.relaunch,
      reset: state.reset,
    })),
  );

  return {
    status,
    isChecking: status.kind === UpdateStatus.Checking,
    hasUpdate: status.kind === UpdateStatus.Available,
    isDownloading: status.kind === UpdateStatus.Downloading,
    isReadyToInstall: status.kind === UpdateStatus.ReadyToInstall,
    error: status.kind === UpdateStatus.Error ? status.message : null,
    checkForUpdates,
    downloadAndInstall,
    relaunch,
    reset,
  };
}