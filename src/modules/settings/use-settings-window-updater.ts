import {
  SETTINGS_CHANGE_KIND,
  SETTINGS_RPC_OPERATION,
  SETTINGS_UPDATE_STATUS,
  type SettingsUpdateInfoDto,
} from "./settings-window-protocol";
import { requestSettingsOperation } from "./settings-window-client";
import { useSettingsWindowStore } from "./settings-window-store";

interface SettingsWindowUpdaterResult {
  status: SettingsUpdateInfoDto;
  isChecking: boolean;
  isDownloading: boolean;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  relaunch: () => Promise<void>;
}

const IDLE_UPDATE_STATUS: SettingsUpdateInfoDto = {
  kind: SETTINGS_UPDATE_STATUS.IDLE,
};

async function runUpdaterOperation(
  operation:
    | typeof SETTINGS_RPC_OPERATION.CHECK_FOR_UPDATES
    | typeof SETTINGS_RPC_OPERATION.DOWNLOAD_UPDATE,
): Promise<void> {
  const status = await requestSettingsOperation(operation, {});
  useSettingsWindowStore
    .getState()
    .applyChange({ kind: SETTINGS_CHANGE_KIND.UPDATER, value: status });
}

export function useSettingsWindowUpdater(): SettingsWindowUpdaterResult {
  const status = useSettingsWindowStore((state) => state.snapshot?.updater ?? IDLE_UPDATE_STATUS);

  return {
    status,
    isChecking: status.kind === SETTINGS_UPDATE_STATUS.CHECKING,
    isDownloading: status.kind === SETTINGS_UPDATE_STATUS.DOWNLOADING,
    checkForUpdates: () => runUpdaterOperation(SETTINGS_RPC_OPERATION.CHECK_FOR_UPDATES),
    downloadAndInstall: () => runUpdaterOperation(SETTINGS_RPC_OPERATION.DOWNLOAD_UPDATE),
    relaunch: async () => {
      await requestSettingsOperation(SETTINGS_RPC_OPERATION.RELAUNCH, {});
    },
  };
}
