export {
  checkForUpdate,
  downloadAndInstallUpdate,
  relaunchApplication,
} from "./adapters/tauri-updater.adapter";
export { useUpdater } from "./hooks/use-updater";
export { UpdateToast } from "./components/UpdateToast";
export {
  UpdateStatus,
  calculateProgressPercentage,
  createIdleStatus,
  createCheckingStatus,
  createAvailableStatus,
  createDownloadingStatus,
  createReadyToInstallStatus,
  createErrorStatus,
} from "./domain/update-status";
export type {
  UpdateDownloadProgress,
  UpdateInfo,
} from "./domain/update-status";
export type { UseUpdaterResult } from "./hooks/use-updater";
export type { UpdateToastProps } from "./components/UpdateToast";
